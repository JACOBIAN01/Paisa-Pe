import type { Txn } from '@pp/contracts-domain';
import { NetworkError } from '@pp/core-result';
import { createSyncService } from '../index';
import { DIYA, PRIMARY, flushWrites, setup } from './helpers';

const serverIds = (env: ReturnType<typeof setup>): string[] =>
  env.server.admin.listTxns(PRIMARY).map((t) => t.id);

describe('pull', () => {
  it('backfills everything without announcing history as new payments', async () => {
    const env = setup({ pageLimit: 40 });
    const received: Txn[] = [];
    env.bus.on('payment.received', (e) => received.push(e.txn));
    const result = await env.sync.syncNow();
    expect(result.applied).toBe(300);
    expect(env.sync.getTxns()).toHaveLength(300);
    expect(received).toHaveLength(0);
    expect(env.sync.getCursor()).not.toBeNull();
    expect((await env.sync.syncNow()).applied).toBe(0);
  });

  it('announces each newly seen incoming payment exactly once', async () => {
    const env = setup();
    await env.sync.syncNow();
    const received: string[] = [];
    env.bus.on('payment.received', (e) => received.push(e.txn.id));
    env.clock.advance(5);
    const txn = env.server.admin.receivePayment(PRIMARY, DIYA, 5_000, 'thanks');
    await env.sync.syncNow();
    await env.sync.syncNow();
    expect(received).toEqual([txn.id]);
  });

  it('never skips rows that share an updatedAt across a page boundary', async () => {
    const env = setup({ pageLimit: 3 });
    for (let i = 0; i < 11; i += 1) env.server.admin.credit(PRIMARY, 100 + i);
    await env.sync.syncNow();
    const local = new Set(env.sync.getTxns().map((t) => t.id));
    expect([...local].sort()).toEqual(serverIds(env).sort());
  });

  it('picks up rows that appear between syncs using the held cursor', async () => {
    const env = setup({ pageLimit: 4 });
    await env.sync.syncNow();
    env.clock.advance(1);
    for (let i = 0; i < 6; i += 1) env.server.admin.credit(PRIMARY, 200 + i);
    const result = await env.sync.syncNow();
    expect(result.applied).toBe(6);
    expect(env.sync.getTxns()).toHaveLength(306);
  });

  it('shares one run between concurrent callers', async () => {
    const env = setup();
    const [a, b] = await Promise.all([env.sync.syncNow(), env.sync.syncNow()]);
    expect(a).toBe(b);
    const pulls = env.calls.filter((n) => n === 'sync.delta').length;
    await env.sync.syncNow();
    expect(env.calls.filter((n) => n === 'sync.delta').length).toBeGreaterThan(pulls);
  });

  it('keeps its place when a later page fails and finishes without duplicates', async () => {
    const env = setup({ pageLimit: 50 });
    let pulls = 0;
    const failing = createSyncService({
      http: {
        call: ((name: string, input: never) => {
          if (name === 'sync.delta' && (pulls += 1) === 2) throw new NetworkError('offline');
          return (env.real.call as (n: string, i: never) => unknown)(name, input);
        }) as typeof env.http.call,
      },
      storage: env.storage,
      bus: env.bus,
      clock: env.clock,
      userId: PRIMARY,
      pageLimit: 50,
    });
    await expect(failing.syncNow()).rejects.toBeInstanceOf(NetworkError);
    const partial = failing.getTxns().length;
    expect(partial).toBe(50);
    const cursorAfterFailure = failing.getCursor();
    expect(cursorAfterFailure).not.toBeNull();
    await failing.syncNow();
    expect(failing.getTxns()).toHaveLength(300);
  });

  it('emits sync.completed and persists the cursor per user', async () => {
    const env = setup();
    const done: Array<{ applied: number }> = [];
    env.bus.on('sync.completed', (e) => done.push(e));
    await env.sync.syncNow();
    await flushWrites();
    expect(done).toHaveLength(1);
    const reopened = createSyncService({
      http: env.http,
      storage: env.storage,
      bus: env.bus,
      clock: env.clock,
      userId: PRIMARY,
    });
    await reopened.hydrate();
    expect(reopened.getCursor()).toBe(env.sync.getCursor());
    expect(reopened.getTxns()).toHaveLength(300);
  });
});

describe('note edits', () => {
  it('pushes a pending edit and clears it once the server applied it', async () => {
    const env = setup();
    await env.sync.syncNow();
    const target = env.sync.getTxns()[0]!;
    await env.sync.editNote(target.id, 'rent');
    expect(env.sync.getTxns()[0]?.note).toBe('rent');
    const result = await env.sync.syncNow();
    expect(result.pushed).toBe(1);
    expect(env.sync.getPendingEdits()).toHaveLength(0);
    expect(env.server.admin.listTxns(PRIMARY).find((t) => t.id === target.id)?.note).toBe('rent');
  });

  it('keeps a pending edit when the push fails and re-sends it later', async () => {
    const env = setup();
    await env.sync.syncNow();
    const target = env.sync.getTxns()[0]!;
    await env.sync.editNote(target.id, 'groceries');
    env.server.admin.failNext({ endpoint: 'sync.push' }, 1);
    await expect(env.sync.syncNow()).rejects.toBeDefined();
    expect(env.sync.getPendingEdits()).toHaveLength(1);
    await env.sync.syncNow();
    expect(env.sync.getPendingEdits()).toHaveLength(0);
    expect(env.server.admin.listTxns(PRIMARY).find((t) => t.id === target.id)?.note).toBe(
      'groceries',
    );
  });

  it.each([
    ['server clock far ahead', { server: 86_400_000 * 3, device: 0 }],
    ['server clock far behind', { server: -86_400_000 * 3, device: 0 }],
    ['device clock far behind', { server: 0, device: -86_400_000 * 30 }],
    ['device clock far ahead', { server: 0, device: 86_400_000 * 30 }],
  ])('skew never drops a pending edit (%s)', async (_label, skew) => {
    const env = setup();
    await env.sync.syncNow();
    env.server.admin.setClockSkew(skew.server);
    env.clock.advance(skew.device);
    env.relogin();
    const target = env.sync.getTxns()[0]!;
    await env.sync.editNote(target.id, 'skewed');
    env.server.admin.failNext({ endpoint: 'sync.push' }, 1);
    await expect(env.sync.syncNow()).rejects.toBeDefined();
    expect(env.sync.getPendingEdits()).toHaveLength(1);
    await env.sync.syncNow();
    expect(env.sync.getPendingEdits()).toHaveLength(0);
    expect(env.server.admin.listTxns(PRIMARY).find((t) => t.id === target.id)?.note).toBe('skewed');
  });

  it('a newer server copy does not discard the local pending edit', async () => {
    const env = setup();
    await env.sync.syncNow();
    const target = env.sync.getTxns()[0]!;
    await env.sync.editNote(target.id, 'mine');
    const stored = env.server.db.t.txns.find((t) => t.id === target.id)!;
    stored.updatedAt += 1_000;
    env.server.admin.failNext({ endpoint: 'sync.push' }, 1);
    await expect(env.sync.syncNow()).rejects.toBeDefined();
    expect(env.sync.getTxns().find((t) => t.id === target.id)?.note).toBe('mine');
    await env.sync.syncNow();
    expect(env.server.admin.listTxns(PRIMARY).find((t) => t.id === target.id)?.note).toBe('mine');
  });

  it('only the latest edit per transaction is kept', async () => {
    const env = setup();
    await env.sync.syncNow();
    const target = env.sync.getTxns()[0]!;
    await env.sync.editNote(target.id, 'one');
    await env.sync.editNote(target.id, 'two');
    expect(env.sync.getPendingEdits().map((e) => e.note)).toEqual(['two']);
  });
});
