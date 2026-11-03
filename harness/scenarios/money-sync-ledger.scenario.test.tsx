import { paise } from '@pp/core-money';
import { LEDGER } from '@pp/svc-ledger';
import { SYNC_SERVICE } from '@pp/svc-sync';
import { createTestApp, recordEvents, type TestApp } from '../index';
import { balanceOf, txnsOf } from './money-support';

let app: TestApp;

beforeEach(async () => {
  app = await createTestApp();
});

afterEach(() => {
  app.dispose();
});

describe('scenario 24: delta sync and the ledger', () => {
  it('pulls the whole history across pages without skipping or repeating a row', async () => {
    const sync = app.container.resolve(SYNC_SERVICE);
    const events = recordEvents();
    await sync.syncNow();

    const server = txnsOf(app);
    const local = sync.getTxns();
    expect(server.length).toBeGreaterThanOrEqual(300);
    expect(local).toHaveLength(server.length);
    expect(new Set(local.map((t) => t.id)).size).toBe(local.length);
    expect(new Set(local.map((t) => t.id))).toEqual(new Set(server.map((t) => t.id)));

    // The seeded history contains runs of rows that share an updatedAt.
    const stamps = server.map((t) => t.updatedAt);
    expect(new Set(stamps).size).toBeLessThan(stamps.length);
    // Backfilling history never announces old credits as new payments.
    expect(events.count('payment.received')).toBe(0);

    const cursor = sync.getCursor();
    await sync.syncNow();
    expect(sync.getCursor()).toBe(cursor);
    expect(sync.getTxns()).toHaveLength(server.length);
    events.stop();
  });

  it('credits an incoming payment exactly once and agrees with a fresh balance fetch', async () => {
    const sync = app.container.resolve(SYNC_SERVICE);
    const ledger = app.container.resolve(LEDGER);
    const events = recordEvents();
    await ledger.fetchBalance();
    await sync.syncNow();
    expect(ledger.projectedBalance()).toBe(balanceOf(app));

    await app.clock.tick(1_000);
    const before = balanceOf(app);
    app.admin.receivePayment('usr_001', 'usr_003', 12_345, 'Refund');
    await sync.syncNow();

    expect(events.count('payment.received')).toBe(1);
    expect(ledger.projectedBalance()).toBe(paise(before + 12_345));

    await sync.syncNow();
    expect(events.count('payment.received')).toBe(1);
    expect(ledger.projectedBalance()).toBe(paise(before + 12_345));

    const fetched = await ledger.fetchBalance();
    expect(fetched.balance).toBe(before + 12_345);
    expect(ledger.projectedBalance()).toBe(fetched.balance);
    events.stop();
  });
});
