import { createMemoryBackend } from '@pp/mock-db';
import { buildHandlers } from '../handlers';
import { endpoints } from '@pp/contracts-api';
import { createMockServer } from '../index';
import { DIYA_PHONE, PRIMARY, T0, login, setBalance, setup } from './helpers';
import { createManualClock } from '../clock';

const sendInit = (token: string, key: string, signal?: AbortSignal) => ({
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Idempotency-Key': key,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ to: { phone: DIYA_PHONE }, amount: 10_000 }),
  signal,
});

describe('routing and validation', () => {
  it('has a handler for every endpoint with matching auth', () => {
    expect(Object.keys(buildHandlers()).sort()).toEqual(Object.keys(endpoints).sort());
  });

  it('answers unknown routes and bad bodies with the error envelope', async () => {
    const { server } = setup();
    const missing = await server.fetch('/nope');
    expect(missing.status).toBe(404);
    expect(((await missing.json()) as { error: { code: string } }).error.code).toBe('not_found');
    const bad = await server.fetch('/auth/otp/request', { method: 'POST', body: '{oops' });
    expect(bad.status).toBe(400);
    const wrongMethod = await server.fetch('/wallet/balance', { method: 'POST' });
    expect(wrongMethod.status).toBe(404);
  });

  it('serves ResponseLike objects with headers and server time', async () => {
    const { server } = setup();
    const { session } = login(server);
    const res = await server.fetch('https://api.paisape.test/wallet/balance?x=1', {
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(res.ok).toBe(true);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('x-server-time')).toBe(String(T0));
    expect(((await res.json()) as { balance: number }).balance).toBe(
      server.admin.getBalance(PRIMARY).balance,
    );
    expect(JSON.parse(await res.text())).toHaveProperty('version');
  });
});

describe('chaos through fetch', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('dropResponse: the server debits once, the client sees a network failure, a keyed retry replays', async () => {
    const { server } = setup();
    const { session } = login(server);
    setBalance(server, PRIMARY, 100_000);
    server.admin.dropResponse({ endpoint: 'transfers.send' });
    await expect(server.fetch('/transfers', sendInit(session.accessToken, 'k'))).rejects.toThrow(
      'Network request failed',
    );
    expect(server.admin.getBalance(PRIMARY).balance).toBe(90_000);
    const retry = await server.fetch('/transfers', sendInit(session.accessToken, 'k'));
    expect(retry.headers.get('idempotency-replayed')).toBe('true');
    expect(server.admin.getBalance(PRIMARY).balance).toBe(90_000);
    expect(server.admin.countTransfersWithKey(PRIMARY, 'k')).toBe(1);
  });

  it('dropResponse hang mode ends only on abort, after the server has processed', async () => {
    const { server } = setup();
    const { session } = login(server);
    setBalance(server, PRIMARY, 100_000);
    server.admin.dropResponse(undefined, 1, 'hang');
    const controller = new AbortController();
    const pending = server.fetch(
      '/transfers',
      sendInit(session.accessToken, 'k', controller.signal),
    );
    const outcome = pending.then(
      () => 'resolved',
      (error: Error) => error.name,
    );
    await jest.advanceTimersByTimeAsync(60_000);
    controller.abort();
    expect(await outcome).toBe('AbortError');
    expect(server.admin.getBalance(PRIMARY).balance).toBe(90_000);
  });

  it('timeoutNext: the request is lost, the client hears nothing until it aborts', async () => {
    const { server } = setup();
    const { session } = login(server);
    setBalance(server, PRIMARY, 100_000);
    server.admin.timeoutNext({ endpoint: 'transfers.send' });
    const controller = new AbortController();
    let settled = false;
    const pending = server
      .fetch('/transfers', sendInit(session.accessToken, 'k', controller.signal))
      .catch((error: Error) => error)
      .finally(() => {
        settled = true;
      });
    await jest.advanceTimersByTimeAsync(120_000);
    expect(settled).toBe(false);
    controller.abort();
    expect(((await pending) as Error).name).toBe('AbortError');
    expect(server.admin.getBalance(PRIMARY).balance).toBe(100_000);
    const next = await server.fetch('/transfers', sendInit(session.accessToken, 'k2'));
    expect(next.status).toBe(200);
  });

  it('aborting during the downlink leaves the transfer processed', async () => {
    const { server } = setup();
    const { session } = login(server);
    setBalance(server, PRIMARY, 100_000);
    server.chaos.setLatency({ uplinkMs: 50, downlinkMs: 500 });
    const controller = new AbortController();
    const pending = server
      .fetch('/transfers', sendInit(session.accessToken, 'k', controller.signal))
      .catch((error: Error) => error.name);
    await jest.advanceTimersByTimeAsync(49);
    expect(server.admin.getBalance(PRIMARY).balance).toBe(100_000);
    await jest.advanceTimersByTimeAsync(2);
    expect(server.admin.getBalance(PRIMARY).balance).toBe(90_000);
    controller.abort();
    expect(await pending).toBe('AbortError');
    expect(server.admin.countTransfersWithKey(PRIMARY, 'k')).toBe(1);
  });

  it('aborting during the uplink means the server never sees the request', async () => {
    const { server } = setup();
    const { session } = login(server);
    setBalance(server, PRIMARY, 100_000);
    server.chaos.setLatency({ uplinkMs: 200 });
    const controller = new AbortController();
    const pending = server
      .fetch('/transfers', sendInit(session.accessToken, 'k', controller.signal))
      .catch((error: Error) => error.name);
    await jest.advanceTimersByTimeAsync(100);
    controller.abort();
    expect(await pending).toBe('AbortError');
    await jest.advanceTimersByTimeAsync(1000);
    expect(server.admin.getBalance(PRIMARY).balance).toBe(100_000);
  });

  it('failNext returns a retryable 503 without processing', async () => {
    const { server } = setup();
    const { session } = login(server);
    setBalance(server, PRIMARY, 100_000);
    server.admin.failNext({ endpoint: 'transfers.send' }, 1);
    const failed = await server.fetch('/transfers', sendInit(session.accessToken, 'k'));
    expect(failed.status).toBe(503);
    expect(((await failed.json()) as { error: { retryable: boolean } }).error.retryable).toBe(true);
    expect(server.admin.getBalance(PRIMARY).balance).toBe(100_000);
    expect((await server.fetch('/transfers', sendInit(session.accessToken, 'k'))).status).toBe(200);
  });

  it('applies latency on both legs with the fake clock', async () => {
    const { server } = setup();
    server.chaos.setLatency({ uplinkMs: 100, downlinkMs: 150 });
    let done = false;
    void server
      .fetch('/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ phone: '+919800000001' }),
      })
      .then(() => {
        done = true;
      });
    await jest.advanceTimersByTimeAsync(249);
    expect(done).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });

  it('skews server time', async () => {
    const { server } = setup();
    const { session } = login(server);
    server.admin.setClockSkew(16 * 60_000);
    const res = await server.fetch('/wallet/balance', {
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(res.status).toBe(401);
    expect(res.headers.get('x-server-time')).toBe(String(T0 + 16 * 60_000));
  });
});

describe('determinism and persistence', () => {
  it('builds identical state for the same seed and clock', () => {
    const a = createMockServer({ clock: createManualClock(T0), seed: 11 });
    const b = createMockServer({ clock: createManualClock(T0), seed: 11 });
    expect(a.db.snapshot()).toEqual(b.db.snapshot());
    const loginA = a.admin.loginAs(PRIMARY);
    const loginB = b.admin.loginAs(PRIMARY);
    expect(loginA.accessToken).toBe(loginB.accessToken);
  });

  it('reset and seed rebuild fixtures in place', () => {
    const { server } = setup();
    const original = server.db.snapshot();
    server.admin.credit(PRIMARY, 5000);
    expect(server.db.snapshot()).not.toEqual(original);
    server.admin.reset();
    expect(server.db.snapshot()).toEqual(original);
    server.admin.seed(99);
    expect(server.db.snapshot()).not.toEqual(original);
  });

  it('persists writes and restores them in a new server', async () => {
    jest.useRealTimers();
    const backend = createMemoryBackend();
    const first = createMockServer({
      clock: createManualClock(T0),
      seed: 3,
      persistence: { backend },
    });
    await first.ready;
    const { api } = login(first);
    setBalance(first, PRIMARY, 100_000);
    api.keyed('/transfers', { to: { phone: DIYA_PHONE }, amount: 10_000 }, 'k');
    await first.flush();
    const second = createMockServer({
      clock: createManualClock(T0),
      seed: 3,
      persistence: { backend },
    });
    await second.ready;
    expect(second.admin.getBalance(PRIMARY).balance).toBe(first.admin.getBalance(PRIMARY).balance);
    expect(second.admin.countTransfersWithKey(PRIMARY, 'k')).toBe(1);
    expect(second.db.t.sessions.size).toBe(first.db.t.sessions.size);
  });
});
