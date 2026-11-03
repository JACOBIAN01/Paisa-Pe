import { AbortedError } from '@pp/core-result';
import { createTransferService } from '../index';
import { paise } from '@pp/core-money';
import type { Txn } from '@pp/contracts-domain';
import { DIYA, PRIMARY, pay, setup } from './helpers';

const balance = (env: ReturnType<typeof setup>): number =>
  env.server.admin.getBalance(PRIMARY).balance;

describe('sending', () => {
  it('sends once, settles the ledger and emits payment.sent', async () => {
    const env = setup();
    const events: Txn[] = [];
    env.bus.on('payment.sent', (e) => events.push(e.txn));
    const before = balance(env);
    const intent = await env.transfers.createIntent(pay(25_000));
    const outcome = await env.transfers.send(intent.id);
    expect(outcome.status).toBe('sent');
    expect(balance(env)).toBe(before - 25_000);
    expect(env.ledger.projectedBalance()).toBe(before - 25_000);
    expect(env.server.admin.countTransfersWithKey(PRIMARY, intent.key)).toBe(1);
    expect(events).toHaveLength(1);
    expect(env.transfers.getIntent(intent.id)?.status).toBe('sent');
  });

  it('double tap shares one request', async () => {
    const env = setup();
    const before = balance(env);
    const intent = await env.transfers.createIntent(pay(10_000));
    const [a, b] = await Promise.all([
      env.transfers.send(intent.id),
      env.transfers.send(intent.id),
    ]);
    expect(env.sent).toHaveLength(1);
    expect(a).toEqual(b);
    expect(balance(env)).toBe(before - 10_000);
    const again = await env.transfers.send(intent.id);
    expect(again.status).toBe('sent');
    expect(env.sent).toHaveLength(1);
  });

  it('keeps the same key on the intent across attempts', async () => {
    const env = setup();
    const intent = await env.transfers.createIntent(pay(10_000));
    env.server.admin.failNext({ endpoint: 'transfers.send' }, 2);
    await env.transfers.send(intent.id);
    env.clock.advance(1_000);
    await env.transfers.flushQueue();
    env.clock.advance(1_000);
    await env.transfers.flushQueue();
    expect(env.transfers.getIntent(intent.id)?.key).toBe(intent.key);
    expect(env.server.admin.countTransfersWithKey(PRIMARY, intent.key)).toBe(1);
  });

  it('terminal api errors fail the intent and roll the ledger back', async () => {
    const env = setup();
    const failures: string[] = [];
    env.bus.on('payment.failed', (e) => failures.push(e.code));
    await env.ledger.fetchBalance();
    const before = env.ledger.projectedBalance();
    const intent = await env.transfers.createIntent(pay(50_000_000));
    const outcome = await env.transfers.send(intent.id);
    expect(outcome.status).toBe('failed');
    expect(env.ledger.projectedBalance()).toBe(before);
    expect(env.ledger.getState().pending).toHaveLength(0);
    expect(await env.transfers.pendingCount()).toBe(0);
    expect(failures).toHaveLength(1);
  });
});

describe('unreliable network', () => {
  it('dropped response then retry debits exactly once', async () => {
    const env = setup();
    const before = balance(env);
    const intent = await env.transfers.createIntent(pay(30_000));
    env.server.admin.dropResponse({ endpoint: 'transfers.send' });
    expect((await env.transfers.send(intent.id)).status).toBe('queued');
    expect(balance(env)).toBe(before - 30_000);
    env.clock.advance(1_000);
    const report = await env.transfers.flushQueue();
    expect(report).toMatchObject({ sent: 1, remaining: 0 });
    expect(balance(env)).toBe(before - 30_000);
    expect(env.server.admin.countTransfersWithKey(PRIMARY, intent.key)).toBe(1);
    expect(env.ledger.projectedBalance()).toBe(before - 30_000);
  });

  it('timeout then retry debits exactly once', async () => {
    const env = setup({ timeoutMs: 40 });
    const before = balance(env);
    const intent = await env.transfers.createIntent(pay(30_000));
    env.server.admin.timeoutNext({ endpoint: 'transfers.send' });
    expect((await env.transfers.send(intent.id)).status).toBe('queued');
    env.clock.advance(1_000);
    expect((await env.transfers.flushQueue()).sent).toBe(1);
    expect(balance(env)).toBe(before - 30_000);
    expect(env.server.admin.countTransfersWithKey(PRIMARY, intent.key)).toBe(1);
  });

  it('abort in flight is resolved with the same key and debits once', async () => {
    const env = setup();
    const before = balance(env);
    env.server.chaos.setLatency({ downlinkMs: 150 });
    const intent = await env.transfers.createIntent(pay(20_000));
    const controller = new AbortController();
    const pending = env.transfers.send(intent.id, { signal: controller.signal });
    setTimeout(() => controller.abort(), 20);
    expect(await pending).toEqual({ status: 'unknown' });
    expect(env.transfers.getIntent(intent.id)?.status).toBe('unknown');
    expect(env.ledger.getState().pending).toHaveLength(1);

    env.server.chaos.setLatency({ downlinkMs: 0 });
    const report = await env.transfers.flushQueue();
    expect(report.sent).toBe(1);
    expect(balance(env)).toBe(before - 20_000);
    expect(env.server.admin.countTransfersWithKey(PRIMARY, intent.key)).toBe(1);
    expect(env.transfers.getIntent(intent.id)?.status).toBe('sent');
    expect(new AbortedError().retryable).toBe(false);
  });

  it('an abort before the server sees the request still sends once on resolve', async () => {
    const env = setup();
    const before = balance(env);
    env.server.chaos.setLatency({ uplinkMs: 150 });
    const intent = await env.transfers.createIntent(pay(20_000));
    const controller = new AbortController();
    const pending = env.transfers.send(intent.id, { signal: controller.signal });
    setTimeout(() => controller.abort(), 20);
    expect((await pending).status).toBe('unknown');
    expect(balance(env)).toBe(before);
    env.server.chaos.setLatency({ uplinkMs: 0 });
    await env.transfers.flushQueue();
    expect(balance(env)).toBe(before - 20_000);
  });

  it('overlapping flushes never duplicate transfers', async () => {
    const env = setup();
    const before = balance(env);
    const ids: string[] = [];
    env.server.admin.failNext({ endpoint: 'transfers.send' }, 3);
    for (const amount of [1_000, 2_000, 3_000]) {
      const intent = await env.transfers.createIntent(pay(amount));
      ids.push(intent.key);
      await env.transfers.send(intent.id);
    }
    expect(await env.transfers.pendingCount()).toBe(3);
    env.clock.advance(1_000);
    env.server.chaos.setLatency({ downlinkMs: 30, uplinkMs: 30 });
    const flushes = await Promise.all([
      env.transfers.flushQueue(),
      env.transfers.flushQueue(),
      env.transfers.flushQueue(),
    ]);
    expect(flushes[1]).toBe(flushes[0]);
    expect(flushes[2]).toBe(flushes[0]);
    expect(balance(env)).toBe(before - 6_000);
    for (const key of ids) expect(env.server.admin.countTransfersWithKey(PRIMARY, key)).toBe(1);
    expect(await env.transfers.pendingCount()).toBe(0);
  });

  it('a timer tick during a running flush is skipped', async () => {
    let tick: () => void = () => undefined;
    const env = setup({
      deps: {
        schedule: (_ms, fn) => {
          tick = fn;
          return () => undefined;
        },
      },
    });
    const before = balance(env);
    env.server.admin.failNext({ endpoint: 'transfers.send' }, 1);
    const intent = await env.transfers.createIntent(pay(4_000));
    await env.transfers.send(intent.id);
    env.clock.advance(1_000);
    env.server.chaos.setLatency({ downlinkMs: 40 });
    env.transfers.start();
    tick();
    tick();
    tick();
    await env.transfers.flushQueue();
    env.transfers.stop();
    expect(balance(env)).toBe(before - 4_000);
    expect(env.server.admin.countTransfersWithKey(PRIMARY, intent.key)).toBe(1);
  });
});

describe('connectivity', () => {
  it('does not flush while offline and flushes when the connection returns', async () => {
    let online = false;
    let notify: (up: boolean) => void = () => undefined;
    const env = setup({
      deps: {
        isOnline: () => online,
        onOnlineChange: (listener) => {
          notify = listener;
          return () => undefined;
        },
      },
    });
    const intent = await env.transfers.createIntent(pay(5_000));
    env.server.admin.failNext({ endpoint: 'transfers.send' }, 1);
    await env.transfers.send(intent.id);
    env.clock.advance(1_000);
    expect((await env.transfers.flushQueue()).sent).toBe(0);
    env.transfers.start();
    online = true;
    notify(true);
    await env.transfers.flushQueue();
    env.transfers.stop();
    expect(env.transfers.getIntent(intent.id)?.status).toBe('sent');
  });

  it('stop removes the connectivity listener', () => {
    const off = jest.fn();
    const cancel = jest.fn();
    const env = setup({ deps: { onOnlineChange: () => off, schedule: () => cancel } });
    env.transfers.start();
    env.transfers.stop();
    expect(off).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});

describe('recovery and repeat', () => {
  it('an intent left sending by a crash is resolved with its original key', async () => {
    const env = setup();
    const before = balance(env);
    const intent = await env.transfers.createIntent(pay(7_000));
    await env.storage.setJSON('transfers.intents', [{ ...intent, status: 'sending', attempts: 1 }]);
    const second = createTransferService({
      http: env.http,
      storage: env.storage,
      ledger: env.ledger,
      bus: env.bus,
      clock: env.clock,
      userId: PRIMARY,
    });
    await second.hydrate();
    expect(second.getIntent(intent.id)?.status).toBe('unknown');
    const report = await second.flushQueue();
    expect(report.sent).toBe(1);
    expect(balance(env)).toBe(before - 7_000);
    expect(env.server.admin.countTransfersWithKey(PRIMARY, intent.key)).toBe(1);
  });

  it('repeatPayment creates a fresh intent with a new key from my own txn', async () => {
    const env = setup();
    const first = await env.transfers.createIntent({ ...pay(9_000), note: 'lunch' });
    const outcome = await env.transfers.send(first.id);
    if (outcome.status !== 'sent') throw new Error('expected sent');
    const again = await env.transfers.repeatPayment(outcome.txn.id);
    expect(again.id).not.toBe(first.id);
    expect(again.key).not.toBe(first.key);
    expect(again.amount).toBe(paise(9_000));
    expect(again.note).toBe('lunch');
  });

  it("repeatPayment refuses another user's transaction", async () => {
    const env = setup();
    const foreign = env.server.admin.listTxns(DIYA)[0];
    await expect(env.transfers.repeatPayment(foreign!.id)).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});
