import { PaiseSchema } from '@pp/contracts-domain';
import {
  AbortedError,
  ApiRequestError,
  AppError,
  NetworkError,
  TimeoutError,
} from '@pp/core-result';
import {
  backoffDelay,
  buildUrl,
  createHttpClient,
  createIdempotencyKey,
  fillPath,
  toQueryString,
  type RetryPolicy,
} from '../index';
import {
  apiError,
  balanceBody,
  hang,
  hangForever,
  networkDown,
  reply,
  scriptedFetch,
  type Step,
} from './helpers';

const policy: RetryPolicy = { maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 1000, jitter: 0 };
const make = (fetch: Step[], extra: Partial<Parameters<typeof createHttpClient>[0]> = {}) => {
  const scripted = scriptedFetch(...fetch);
  const client = createHttpClient({
    baseUrl: 'https://api.test',
    fetch: scripted.fetch,
    retry: policy,
    ...extra,
  });
  return { client, calls: scripted.calls };
};

const send = { to: { phone: '+919812345678' }, amount: PaiseSchema.parse(5000) } as const;

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('urls', () => {
  it('fills and encodes path params', () => {
    expect(fillPath('/a/:id/b', { id: 'x y/z' })).toBe('/a/x%20y%2Fz/b');
    expect(() => fillPath('/a/:id')).toThrow(AppError);
  });
  it('serialises queries sorted, skipping empties', () => {
    expect(toQueryString({ b: 2, a: 'x&y', c: undefined, d: null })).toBe('?a=x%26y&b=2');
    expect(toQueryString({})).toBe('');
    expect(buildUrl('https://h/', '/p/:id', { id: 1 }, { q: 'z' })).toBe('https://h/p/1?q=z');
  });
});

describe('backoffDelay', () => {
  it('doubles up to the cap', () => {
    const p = { ...policy, jitter: 0 };
    expect([1, 2, 3, 4, 5].map((n) => backoffDelay(n, p))).toEqual([100, 200, 400, 800, 1000]);
  });
  it('keeps jitter inside the allowed band', () => {
    const p = { ...policy, jitter: 0.5 };
    expect(backoffDelay(2, p, () => 0)).toBe(100);
    expect(backoffDelay(2, p, () => 1)).toBe(200);
  });
  it('depends only on its arguments', () => {
    expect(backoffDelay(3, policy)).toBe(backoffDelay(3, policy));
  });
});

describe('createIdempotencyKey', () => {
  it('returns unique uuid-shaped keys', () => {
    const a = createIdempotencyKey();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(createIdempotencyKey()).not.toBe(a);
  });
});

describe('requests', () => {
  it('sends auth and parses a validated response', async () => {
    const { client, calls } = make([() => reply(200, balanceBody)], {
      getAccessToken: () => 'tok',
    });
    const res = await client.call('wallet.balance');
    expect(res.version).toBe(2);
    expect(calls[0]?.url).toBe('https://api.test/wallet/balance');
    expect(calls[0]?.init.headers?.Authorization).toBe('Bearer tok');
  });

  it('substitutes params and query', async () => {
    const { client, calls } = make([() => reply(200, { txn: null })]);
    await client.call('wallet.transaction', { params: { id: 't 1' } }).catch(() => undefined);
    await client.call('wallet.transactions', { query: { limit: 20 } }).catch(() => undefined);
    expect(calls[0]?.url).toBe('https://api.test/wallet/transactions/t%201');
    expect(calls[1]?.url).toBe('https://api.test/wallet/transactions?limit=20');
  });

  it('requires an idempotency key for idempotent endpoints', async () => {
    const { client, calls } = make([() => reply(200, {})]);
    await expect(client.call('transfers.send', { body: send })).rejects.toMatchObject({
      code: 'invalid_request',
    });
    expect(calls).toHaveLength(0);
  });

  it('sends the idempotency header and JSON body', async () => {
    const key = createIdempotencyKey();
    const { client, calls } = make([() => apiError(400, 'invalid_request')]);
    await client.call('transfers.send', { body: send, idempotencyKey: key }).catch(() => undefined);
    expect(calls[0]?.init.headers?.['Idempotency-Key']).toBe(key);
    expect(calls[0]?.init.headers?.['Content-Type']).toBe('application/json');
    expect(JSON.parse(calls[0]?.init.body ?? '{}').amount).toBe(5000);
  });

  it('rejects invalid bodies before touching the network', async () => {
    const { client, calls } = make([() => reply(200, {})]);
    const bad = { ...send, amount: 10.5 } as never;
    await expect(
      client.call('transfers.send', { body: bad, idempotencyKey: createIdempotencyKey() }),
    ).rejects.toMatchObject({ code: 'invalid_request' });
    expect(calls).toHaveLength(0);
  });
});

describe('error mapping', () => {
  it('maps the error envelope to ApiRequestError without retrying', async () => {
    const { client, calls } = make([() => apiError(422, 'insufficient_funds')]);
    const error = await client.call('wallet.balance').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ code: 'insufficient_funds', status: 422, retryable: false });
    expect(calls).toHaveLength(1);
  });

  it('falls back to a status-based code for unstructured bodies', async () => {
    const { client } = make([() => reply(404, 'nope')], { retry: { maxAttempts: 1 } });
    await expect(client.call('wallet.balance')).rejects.toMatchObject({ code: 'not_found' });
  });

  it('treats malformed or unexpected success bodies as non-retryable server errors', async () => {
    const a = make([() => reply(200, '{bad')]);
    await expect(a.client.call('wallet.balance')).rejects.toMatchObject({ code: 'server_error' });
    expect(a.calls).toHaveLength(1);
    const b = make([() => reply(200, { balance: 'x' })]);
    await expect(b.client.call('wallet.balance')).rejects.toMatchObject({ code: 'server_error' });
    expect(b.calls).toHaveLength(1);
  });

  it('returns a Result from callResult', async () => {
    const good = make([() => reply(200, balanceBody)]);
    expect((await good.client.callResult('wallet.balance')).ok).toBe(true);
    const bad = make([() => apiError(403, 'forbidden')]);
    const result = await bad.client.callResult('wallet.balance');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('forbidden');
  });
});

describe('retries', () => {
  it('retries safe calls with exponential backoff', async () => {
    const { client, calls } = make([
      () => apiError(503, 'server_error', true),
      () => reply(200, balanceBody),
    ]);
    const promise = client.call('wallet.balance');
    await jest.advanceTimersByTimeAsync(0);
    expect(calls).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(99);
    expect(calls).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(2);
    await expect(promise).resolves.toMatchObject({ version: 2 });
  });

  it('gives up after maxAttempts', async () => {
    const { client, calls } = make([networkDown], { retry: { ...policy, maxAttempts: 3 } });
    const promise = client.call('wallet.balance').catch((e: unknown) => e);
    await jest.advanceTimersByTimeAsync(10_000);
    expect(await promise).toBeInstanceOf(NetworkError);
    expect(calls).toHaveLength(3);
  });

  it('never replays a non-idempotent POST', async () => {
    const { client, calls } = make([() => apiError(503, 'server_error', true)]);
    const promise = client
      .call('requests.decline', { params: { id: 'r1' } })
      .catch((e: unknown) => e);
    await jest.advanceTimersByTimeAsync(10_000);
    expect(await promise).toBeInstanceOf(ApiRequestError);
    expect(calls).toHaveLength(1);
  });

  it('replays an idempotent POST with the same key', async () => {
    const key = createIdempotencyKey();
    const { client, calls } = make([networkDown, () => apiError(400, 'invalid_request')]);
    const promise = client
      .call('transfers.send', { body: send, idempotencyKey: key })
      .catch((e: unknown) => e);
    await jest.advanceTimersByTimeAsync(1000);
    await promise;
    expect(calls).toHaveLength(2);
    expect(calls.map((c) => c.init.headers?.['Idempotency-Key'])).toEqual([key, key]);
  });

  it('keeps retry timing independent between concurrent calls', async () => {
    const key = createIdempotencyKey();
    const background = scriptedFetch(networkDown);
    const payment = scriptedFetch(networkDown, () => apiError(400, 'invalid_request'));
    const routes: Record<string, typeof background.fetch> = {
      '/wallet/balance': background.fetch,
      '/transfers': payment.fetch,
    };
    const client = createHttpClient({
      baseUrl: 'https://api.test',
      retry: { ...policy, maxAttempts: 8 },
      fetch: (url, init) => routes[url.replace('https://api.test', '')]!(url, init),
    });
    const bg = client.call('wallet.balance').catch((e: unknown) => e);
    await jest.advanceTimersByTimeAsync(2000);
    expect(background.calls.length).toBeGreaterThan(3);
    const pay = client.call('transfers.send', { body: send, idempotencyKey: key }).catch(() => 0);
    await jest.advanceTimersByTimeAsync(99);
    expect(payment.calls).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(payment.calls).toHaveLength(2);
    await jest.advanceTimersByTimeAsync(20_000);
    await Promise.all([bg, pay]);
  });
});

describe('timeouts and aborts', () => {
  it('reports its own timeout as TimeoutError', async () => {
    const { client } = make([hang], { retry: { maxAttempts: 1 }, timeoutMs: 1000 });
    const promise = client.call('wallet.balance').catch((e: unknown) => e);
    await jest.advanceTimersByTimeAsync(1000);
    expect(await promise).toBeInstanceOf(TimeoutError);
  });

  it('times out even if fetch ignores the signal', async () => {
    const { client } = make([hangForever], { retry: { maxAttempts: 1 }, timeoutMs: 500 });
    const promise = client.call('wallet.balance').catch((e: unknown) => e);
    await jest.advanceTimersByTimeAsync(500);
    expect(await promise).toBeInstanceOf(TimeoutError);
  });

  it('reports a caller abort as AbortedError, not a network or timeout error', async () => {
    const { client, calls } = make([hang]);
    const controller = new AbortController();
    const promise = client
      .call('wallet.balance', { signal: controller.signal })
      .catch((e: unknown) => e);
    await jest.advanceTimersByTimeAsync(10);
    controller.abort();
    const error = await promise;
    expect(error).toBeInstanceOf(AbortedError);
    expect(error).not.toBeInstanceOf(NetworkError);
    expect(error).not.toBeInstanceOf(TimeoutError);
    await jest.advanceTimersByTimeAsync(10_000);
    expect(calls).toHaveLength(1);
  });

  it('aborts promptly when fetch ignores the signal', async () => {
    const { client } = make([hangForever]);
    const controller = new AbortController();
    const promise = client
      .call('wallet.balance', { signal: controller.signal })
      .catch((e: unknown) => e);
    controller.abort();
    expect(await promise).toBeInstanceOf(AbortedError);
  });

  it('aborts while waiting to retry', async () => {
    const { client, calls } = make([networkDown]);
    const controller = new AbortController();
    const promise = client
      .call('wallet.balance', { signal: controller.signal })
      .catch((e: unknown) => e);
    await jest.advanceTimersByTimeAsync(50);
    controller.abort();
    expect(await promise).toBeInstanceOf(AbortedError);
    await jest.advanceTimersByTimeAsync(10_000);
    expect(calls).toHaveLength(1);
  });

  it('rejects immediately for an already-aborted signal', async () => {
    const { client, calls } = make([() => reply(200, balanceBody)]);
    const controller = new AbortController();
    controller.abort();
    await expect(
      client.call('wallet.balance', { signal: controller.signal }),
    ).rejects.toBeInstanceOf(AbortedError);
    expect(calls).toHaveLength(0);
  });
});

describe('unauthorized handling', () => {
  it('refreshes once and replays with the new token', async () => {
    let token = 'old';
    const onUnauthorized = jest.fn(async () => {
      token = 'new';
      return true;
    });
    const { client, calls } = make(
      [() => apiError(401, 'token_expired'), () => reply(200, balanceBody)],
      {
        getAccessToken: () => token,
        onUnauthorized,
      },
    );
    await client.call('wallet.balance');
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(calls.map((c) => c.init.headers?.Authorization)).toEqual(['Bearer old', 'Bearer new']);
  });

  it('does not loop when the replay is rejected again', async () => {
    const onUnauthorized = jest.fn(async () => true);
    const { client, calls } = make([() => apiError(401, 'unauthorized')], { onUnauthorized });
    await expect(client.call('wallet.balance')).rejects.toMatchObject({ code: 'unauthorized' });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(2);
  });

  it('surfaces the 401 when refresh fails or throws', async () => {
    const failing = make([() => apiError(401, 'unauthorized')], {
      onUnauthorized: async () => false,
    });
    await expect(failing.client.call('wallet.balance')).rejects.toMatchObject({
      code: 'unauthorized',
    });
    const throwing = make([() => apiError(401, 'unauthorized')], {
      onUnauthorized: () => Promise.reject(new Error('x')),
    });
    await expect(throwing.client.call('wallet.balance')).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('skips refresh for unauthenticated endpoints', async () => {
    const onUnauthorized = jest.fn(async () => true);
    const { client } = make([() => apiError(401, 'unauthorized')], { onUnauthorized });
    await expect(
      client.call('auth.requestOtp', { body: { phone: '+919812345678' } }),
    ).rejects.toMatchObject({ code: 'unauthorized' });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

describe('interceptors', () => {
  it('can rewrite requests and observe responses, and can be removed', async () => {
    const { client, calls } = make([() => reply(200, balanceBody)]);
    const seen: number[] = [];
    const remove = client.use({
      request: (req) => ({ ...req, headers: { ...req.headers, 'X-Trace': '1' } }),
      response: (info) => {
        seen.push(info.status);
        throw new Error('observer failure is ignored');
      },
    });
    await client.call('wallet.balance');
    expect(calls[0]?.init.headers?.['X-Trace']).toBe('1');
    expect(seen).toEqual([200]);
    remove();
    await client.call('wallet.balance');
    expect(calls[1]?.init.headers?.['X-Trace']).toBeUndefined();
    expect(seen).toEqual([200]);
  });
});
