import { paise } from '@pp/core-money';
import type { BalanceView } from '@pp/contracts-api';
import type { Txn } from '@pp/contracts-domain';
import { createLedger } from '../index';
import { PRIMARY, setup } from './helpers';

const view = (balance: number, version: number, asOf = 1_000): BalanceView => ({
  balance: paise(balance),
  version,
  asOf,
});

function build() {
  const env = setup();
  const ledger = createLedger({
    http: env.http,
    storage: env.storage,
    bus: env.bus,
    clock: env.clock,
    userId: PRIMARY,
  });
  ledger.start();
  return { ...env, ledger };
}

const incoming = (id: string, amount: number, updatedAt: number): Txn =>
  ({
    id,
    type: 'p2p_receive',
    status: 'success',
    amount,
    fee: 0,
    balanceAfter: 0,
    createdAt: updatedAt,
    updatedAt,
  }) as unknown as Txn;

describe('ledger balance guard', () => {
  it('ignores stale versions and accepts equal or newer ones', () => {
    const { ledger } = build();
    expect(ledger.applyServerBalance(view(5_000, 4))).toBe(true);
    expect(ledger.applyServerBalance(view(1_000, 3))).toBe(false);
    expect(ledger.projectedBalance()).toBe(5_000);
    expect(ledger.applyServerBalance(view(6_000, 5))).toBe(true);
    expect(ledger.projectedBalance()).toBe(6_000);
  });

  it('newest-started fetch wins when responses arrive out of order', async () => {
    const { ledger, server } = build();
    server.chaos.setLatency({ uplinkMs: 0, downlinkMs: 0 });
    jest.useFakeTimers();
    try {
      server.chaos.setLatency({ downlinkMs: 500 });
      const slow = ledger.fetchBalance();
      await jest.advanceTimersByTimeAsync(10);
      server.admin.credit(PRIMARY, 12_345);
      server.chaos.setLatency({ downlinkMs: 0 });
      const fast = ledger.fetchBalance();
      await fast;
      const afterFast = ledger.projectedBalance();
      await jest.advanceTimersByTimeAsync(600);
      await slow;
      expect(ledger.projectedBalance()).toBe(afterFast);
      expect(afterFast).toBe(server.admin.getBalance(PRIMARY).balance);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('optimistic debits', () => {
  it('projects pending debits and reverses only its own delta on rollback', () => {
    const { ledger } = build();
    ledger.applyServerBalance(view(10_000, 1));
    ledger.beginDebit('a', 3_000);
    ledger.beginDebit('b', 2_000);
    expect(ledger.projectedBalance()).toBe(5_000);
    ledger.applyServerBalance(view(11_000, 2)); // a credit landed in between
    ledger.rollbackDebit('a');
    expect(ledger.projectedBalance()).toBe(9_000);
    expect(ledger.isFresh()).toBe(false);
  });

  it('settling applies the confirming balance', () => {
    const { ledger } = build();
    ledger.applyServerBalance(view(10_000, 1));
    ledger.beginDebit('a', 3_000);
    ledger.settleDebit('a', view(7_000, 2));
    expect(ledger.projectedBalance()).toBe(7_000);
    expect(ledger.getState().pending).toHaveLength(0);
  });

  it('beginDebit is idempotent per id', () => {
    const { ledger } = build();
    ledger.applyServerBalance(view(10_000, 1));
    ledger.beginDebit('a', 3_000);
    ledger.beginDebit('a', 3_000);
    expect(ledger.projectedBalance()).toBe(7_000);
  });
});

describe('payment.received', () => {
  it('credits once and stops counting after a newer server balance', () => {
    const { ledger, bus } = build();
    ledger.applyServerBalance(view(10_000, 1, 1_000));
    const txn = incoming('t1', 500, 2_000);
    bus.emit('payment.received', { txn });
    bus.emit('payment.received', { txn });
    expect(ledger.projectedBalance()).toBe(10_500);
    ledger.applyServerBalance(view(10_500, 2, 2_500));
    expect(ledger.projectedBalance()).toBe(10_500);
  });

  it('still credits when the txn was recorded before the event (as the sync service does)', () => {
    const { ledger, bus } = build();
    ledger.applyServerBalance(view(10_000, 1, 1_000));
    const txn = incoming('t3', 900, 2_000);
    ledger.recordTxn(txn);
    bus.emit('payment.received', { txn });
    expect(ledger.projectedBalance()).toBe(10_900);
  });

  it('does not credit a txn the server balance already includes', () => {
    const { ledger, bus } = build();
    ledger.applyServerBalance(view(10_900, 1, 3_000));
    bus.emit('payment.received', { txn: incoming('t4', 900, 2_000) });
    expect(ledger.projectedBalance()).toBe(10_900);
  });

  it('stops listening after dispose', () => {
    const { ledger, bus } = build();
    ledger.applyServerBalance(view(10_000, 1));
    ledger.dispose();
    bus.emit('payment.received', { txn: incoming('t2', 700, 2_000) });
    expect(ledger.projectedBalance()).toBe(10_000);
    expect(bus.listenerCount('payment.received')).toBe(0);
  });
});

describe('emit and persistence', () => {
  it('emits balance.changed', () => {
    const { ledger, bus } = build();
    const seen: number[] = [];
    bus.on('balance.changed', (e) => seen.push(e.balance));
    ledger.applyServerBalance(view(10_000, 1));
    ledger.beginDebit('a', 1_000);
    expect(seen).toEqual([10_000, 9_000]);
  });

  it('persists state per user and rehydrates it as stale', async () => {
    const first = build();
    first.ledger.applyServerBalance(view(10_000, 1));
    await first.server.flush();
    await new Promise((resolve) => setImmediate(resolve));
    const second = createLedger({
      http: first.http,
      storage: first.storage,
      bus: first.bus,
      clock: first.clock,
      userId: PRIMARY,
    });
    await second.hydrate();
    expect(second.projectedBalance()).toBe(10_000);
    expect(second.isFresh()).toBe(false);
  });
});

describe('reconciliation', () => {
  it('reports zero drift when the mirror matches the server', async () => {
    const { ledger, server, bus, clock } = build();
    await ledger.fetchBalance();
    clock.advance(1);
    const reports: number[] = [];
    bus.on('ledger.reconciled', (e) => reports.push(e.drift));
    const txn = server.admin.credit(PRIMARY, 4_200);
    ledger.recordTxn(txn);
    const report = await ledger.reconcile();
    expect(report.drift).toBe(0);
    expect(report.comparable).toBe(true);
    expect(reports).toEqual([0]);
  });

  it('reports exact drift when a credit was never seen', async () => {
    const { ledger, server, clock } = build();
    await ledger.fetchBalance();
    clock.advance(1);
    server.admin.credit(PRIMARY, 1_001);
    const report = await ledger.reconcile();
    expect(report.drift).toBe(1_001);
  });
});
