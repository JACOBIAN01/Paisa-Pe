import type { Clock } from '@pp/core-time';
import { createQueryClient, hashKey, keys, startsWith } from '../index';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const makeClock = (): Clock & { advance(ms: number): void } => {
  let time = 1_000;
  return { now: () => time, monotonic: () => time, advance: (ms) => void (time += ms) };
};

const setup = () => {
  const clock = makeClock();
  return { clock, client: createQueryClient({ clock }) };
};

const bal = keys.balance('u1');

describe('keys', () => {
  it('puts the user id first in every user key', () => {
    const userKeys = [
      keys.balance('u1'),
      keys.transactions('u1', 2),
      keys.transaction('u1', 't'),
      keys.requests('u1'),
      keys.goals('u1'),
      keys.limits('u1'),
    ];
    for (const key of userKeys) expect(key[0]).toBe('u1');
    expect(hashKey(keys.transactions('u1', 2))).not.toBe(hashKey(keys.transactions('u2', 2)));
  });

  it('matches prefixes by element', () => {
    expect(startsWith(['u1', 'transactions', 0], ['u1'])).toBe(true);
    expect(startsWith(['u1', 'transactions'], ['u1', 'balance'])).toBe(false);
    expect(startsWith(['u1'], ['u1', 'x'])).toBe(false);
  });
});

describe('ensure', () => {
  it('fetches once for concurrent callers', async () => {
    const { client } = setup();
    const fn = jest.fn(async () => 5);
    const [a, b] = await Promise.all([client.ensure(bal, fn), client.ensure(bal, fn)]);
    expect([a, b]).toEqual([5, 5]);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(bal)).toBe(5);
  });

  it('serves fresh data and refetches once stale', async () => {
    const { client, clock } = setup();
    let calls = 0;
    const fn = jest.fn(async () => ++calls);
    await client.ensure(bal, fn, { staleMs: 1000 });
    clock.advance(999);
    await client.ensure(bal, fn, { staleMs: 1000 });
    expect(fn).toHaveBeenCalledTimes(1);
    clock.advance(1);
    await client.ensure(bal, fn, { staleMs: 1000 });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('reports loading, then success', async () => {
    const { client } = setup();
    const d = deferred<number>();
    const seen: string[] = [];
    client.subscribe(bal, () => seen.push(client.getSnapshot(bal).status));
    const pending = client.ensure(bal, () => d.promise);
    expect(client.getSnapshot(bal)).toMatchObject({ status: 'loading', isFetching: true });
    d.resolve(1);
    await pending;
    expect(client.getSnapshot(bal)).toMatchObject({
      status: 'success',
      isFetching: false,
      data: 1,
    });
    expect(seen[0]).toBe('loading');
  });

  it('keeps previous data when a refetch fails', async () => {
    const { client } = setup();
    await client.ensure(bal, async () => 1);
    await expect(client.refetch(bal, () => Promise.reject(new Error('down')))).rejects.toThrow(
      'down',
    );
    expect(client.getSnapshot(bal)).toMatchObject({ status: 'error', data: 1 });
    expect((client.getSnapshot(bal).error as Error).message).toBe('down');
  });

  it('turns a synchronously throwing fetcher into a rejection', async () => {
    const { client } = setup();
    await expect(
      client.ensure(bal, () => {
        throw new Error('sync');
      }),
    ).rejects.toThrow('sync');
    expect(client.getSnapshot(bal).isFetching).toBe(false);
  });
});

describe('request ordering', () => {
  it('never lets an older response overwrite a newer one', async () => {
    const { client } = setup();
    const slow = deferred<number>();
    const fast = deferred<number>();
    const first = client.refetch(bal, () => slow.promise);
    const second = client.refetch(bal, () => fast.promise);
    fast.resolve(200);
    await second;
    expect(client.getQueryData(bal)).toBe(200);
    slow.resolve(100);
    await first;
    expect(client.getQueryData(bal)).toBe(200);
    expect(client.getSnapshot(bal).isFetching).toBe(false);
  });

  it('ignores an older failure once a newer request exists', async () => {
    const { client } = setup();
    const slow = deferred<number>();
    const first = client.refetch(bal, () => slow.promise);
    await client.refetch(bal, async () => 7);
    slow.reject(new Error('late'));
    await expect(first).resolves.toBe(7);
    expect(client.getSnapshot(bal).status).toBe('success');
  });

  it('lets a direct write supersede fetches that started earlier', async () => {
    const { client } = setup();
    const inflight = deferred<number>();
    const pending = client.refetch(bal, () => inflight.promise);
    client.setQueryData<number>(bal, 500);
    inflight.resolve(100);
    await pending;
    expect(client.getQueryData(bal)).toBe(500);
  });
});

describe('invalidate', () => {
  it('marks only matching entries and forces a refetch', async () => {
    const { client } = setup();
    const fn = jest.fn(async () => 1);
    await client.ensure(keys.balance('u1'), fn, { staleMs: Infinity });
    await client.ensure(keys.goals('u2'), fn, { staleMs: Infinity });
    client.invalidate(keys.user('u1'));
    expect(client.getSnapshot(keys.balance('u1')).isInvalidated).toBe(true);
    expect(client.getSnapshot(keys.goals('u2')).isInvalidated).toBe(false);
    await client.ensure(keys.balance('u1'), fn, { staleMs: Infinity });
    await client.ensure(keys.goals('u2'), fn, { staleMs: Infinity });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('refetches observed entries immediately', async () => {
    const { client } = setup();
    let calls = 0;
    const fn = jest.fn(async () => ++calls);
    const off = client.subscribe(bal, () => undefined);
    await client.ensure(bal, fn, { staleMs: Infinity });
    client.invalidate(bal);
    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(2);
    off();
  });

  it('does not treat a response from before the invalidation as fresh', async () => {
    const { client } = setup();
    const d = deferred<number>();
    const pending = client.ensure(bal, () => d.promise, { staleMs: Infinity });
    client.invalidate(bal);
    d.resolve(1);
    await pending;
    expect(client.getQueryData(bal)).toBe(1);
    expect(client.getSnapshot(bal).isInvalidated).toBe(true);
    const fn = jest.fn(async () => 2);
    await client.ensure(bal, fn, { staleMs: Infinity });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not join a request that started before the invalidation', async () => {
    const { client } = setup();
    const old = deferred<number>();
    void client.ensure(bal, () => old.promise);
    client.invalidate(bal);
    const fresh = jest.fn(async () => 9);
    await expect(client.ensure(bal, fresh)).resolves.toBe(9);
    expect(fresh).toHaveBeenCalledTimes(1);
  });
});

describe('optimistic updates', () => {
  it('rollback undoes only its own change and keeps credits that landed meanwhile', async () => {
    const { client } = setup();
    client.setQueryData<number>(bal, 1000);
    const rollback = client.optimisticUpdate<number>(bal, (old) => (old ?? 0) - 300);
    expect(client.getQueryData(bal)).toBe(700);
    client.setQueryData<number>(bal, (old) => (old ?? 0) + 500);
    expect(client.getQueryData(bal)).toBe(1200);
    rollback();
    expect(client.getQueryData(bal)).toBe(1500);
  });

  it('keeps unrelated optimistic changes when one is rolled back', () => {
    const { client } = setup();
    client.setQueryData<number>(bal, 1000);
    const a = client.optimisticUpdate<number>(bal, (old) => (old ?? 0) - 300);
    client.optimisticUpdate<number>(bal, (old) => (old ?? 0) - 200);
    a();
    expect(client.getQueryData(bal)).toBe(800);
  });

  it('is idempotent to undo twice', () => {
    const { client } = setup();
    client.setQueryData<number>(bal, 10);
    const rollback = client.optimisticUpdate<number>(bal, (old) => (old ?? 0) + 5);
    rollback();
    rollback();
    expect(client.getQueryData(bal)).toBe(10);
  });

  it('forces the next fetch to hit the network even with a long stale window', async () => {
    const { client } = setup();
    const fn = jest.fn(async () => 42);
    await client.ensure(bal, fn, { staleMs: Infinity });
    const rollback = client.optimisticUpdate<number>(bal, (old) => (old ?? 0) - 1);
    await client.ensure(bal, fn, { staleMs: Infinity });
    expect(fn).toHaveBeenCalledTimes(2);
    rollback();
    await client.ensure(bal, fn, { staleMs: Infinity });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not accept a read that started before the rollback as fresh', async () => {
    const { client } = setup();
    client.setQueryData<number>(bal, 100);
    const rollback = client.optimisticUpdate<number>(bal, (old) => (old ?? 0) - 30);
    const d = deferred<number>();
    const pending = client.ensure(bal, () => d.promise, { staleMs: Infinity });
    rollback();
    d.resolve(100);
    await pending;
    expect(client.getSnapshot(bal).isInvalidated).toBe(true);
  });

  it('commit removes the layer without reverting the server value', () => {
    const { client } = setup();
    client.setQueryData<number>(bal, 100);
    const handle = client.optimisticUpdate<number>(bal, (old) => (old ?? 0) - 30);
    client.setQueryData<number>(bal, 70);
    handle.commit();
    expect(client.getQueryData(bal)).toBe(70);
  });

  it('works before any data exists', () => {
    const { client } = setup();
    const rollback = client.optimisticUpdate<number[]>(keys.goals('u1'), (old) => [
      ...(old ?? []),
      1,
    ]);
    expect(client.getQueryData(keys.goals('u1'))).toEqual([1]);
    rollback();
    expect(client.getQueryData(keys.goals('u1'))).toBeUndefined();
  });
});

describe('clearing', () => {
  it('drops only the given user and ignores their in-flight results', async () => {
    const { client } = setup();
    await client.ensure(keys.balance('u1'), async () => 1);
    await client.ensure(keys.balance('u2'), async () => 2);
    const d = deferred<number>();
    const pending = client.ensure(keys.goals('u1'), () => d.promise);
    client.clearUser('u1');
    d.resolve(99);
    await pending;
    expect(client.getQueryData(keys.balance('u1'))).toBeUndefined();
    expect(client.getQueryData(keys.goals('u1'))).toBeUndefined();
    expect(client.getQueryData(keys.balance('u2'))).toBe(2);
  });

  it('resets observed entries in place and notifies them', async () => {
    const { client } = setup();
    await client.ensure(bal, async () => 1);
    const listener = jest.fn();
    client.subscribe(bal, listener);
    client.clear();
    expect(listener).toHaveBeenCalled();
    expect(client.getSnapshot(bal)).toMatchObject({ data: undefined, status: 'idle' });
  });

  it('does not refetch cleared entries that were being observed', async () => {
    const { client } = setup();
    const fn = jest.fn(async () => 1);
    client.subscribe(bal, () => undefined);
    await client.ensure(bal, fn);
    client.clear();
    client.invalidate(bal);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('subscriptions', () => {
  it('notifies until unsubscribed', () => {
    const { client } = setup();
    const listener = jest.fn();
    const off = client.subscribe(bal, listener);
    client.setQueryData<number>(bal, 1);
    off();
    client.setQueryData<number>(bal, 2);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('hands out a stable snapshot until something changes', () => {
    const { client } = setup();
    client.setQueryData<number>(bal, 1);
    expect(client.getSnapshot(bal)).toBe(client.getSnapshot(bal));
    expect(client.getSnapshot(keys.goals('nobody'))).toBe(client.getSnapshot(keys.cards('nobody')));
  });
});
