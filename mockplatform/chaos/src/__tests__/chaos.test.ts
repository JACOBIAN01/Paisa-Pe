import { createChaos } from '../chaos';
import { matches } from '../matcher';
import { hang, wait } from '../wait';

const info = { endpoint: 'transfers.send', method: 'POST', path: '/transfers' };

describe('matcher', () => {
  it('matches by endpoint, method and path', () => {
    expect(matches(undefined, info)).toBe(true);
    expect(matches({ endpoint: 'transfers.send' }, info)).toBe(true);
    expect(matches({ endpoint: 'wallet.balance' }, info)).toBe(false);
    expect(matches({ method: 'post', path: /^\/transfers/ }, info)).toBe(true);
    expect(matches({ method: 'GET' }, info)).toBe(false);
    expect(matches({ path: '/other' }, info)).toBe(false);
  });
});

describe('chaos rules', () => {
  it('consumes rules in order and only for matching requests', () => {
    const chaos = createChaos();
    chaos.failNext({ endpoint: 'wallet.balance' }, 2);
    chaos.dropResponse({ endpoint: 'transfers.send' });
    expect(chaos.plan(info).action.kind).toBe('drop');
    expect(chaos.plan(info).action.kind).toBe('normal');
    expect(chaos.plan({ ...info, endpoint: 'wallet.balance' }).action.kind).toBe('fail');
    expect(chaos.pending()).toBe(1);
  });

  it('uses a default 503 failure that can be overridden', () => {
    const chaos = createChaos();
    chaos.failNext();
    chaos.failNext(undefined, 1, { status: 500, code: 'server_error', retryable: false });
    const first = chaos.plan(info).action;
    const second = chaos.plan(info).action;
    expect(first).toMatchObject({ kind: 'fail', response: { status: 503, retryable: true } });
    expect(second).toMatchObject({ kind: 'fail', response: { status: 500, retryable: false } });
  });

  it('adds seeded jitter reproducibly', () => {
    const run = (seed: number) => {
      const chaos = createChaos(seed);
      chaos.setLatency({ uplinkMs: 100, downlinkMs: 50, jitterMs: 40 });
      return [chaos.plan(info), chaos.plan(info)].map((p) => [p.uplinkMs, p.downlinkMs]);
    };
    expect(run(3)).toEqual(run(3));
    for (const [up, down] of run(3)) {
      expect(up).toBeGreaterThanOrEqual(100);
      expect(up).toBeLessThanOrEqual(140);
      expect(down).toBeGreaterThanOrEqual(50);
    }
  });

  it('tracks clock skew and resets', () => {
    const chaos = createChaos();
    chaos.clockSkew(-5000);
    chaos.setLatency({ uplinkMs: 10 });
    chaos.timeoutNext();
    chaos.reset();
    expect(chaos.getClockSkew()).toBe(0);
    expect(chaos.getLatency().uplinkMs).toBe(0);
    expect(chaos.pending()).toBe(0);
  });
});

describe('waiting', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('resolves after the delay on the fake clock', async () => {
    let done = false;
    void wait(100).then(() => {
      done = true;
    });
    await jest.advanceTimersByTimeAsync(99);
    expect(done).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });

  it('rejects with AbortError on abort, including when already aborted', async () => {
    const controller = new AbortController();
    const pending = wait(1000, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await expect(wait(10, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    await expect(hang(controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('hang only ends on abort', async () => {
    const controller = new AbortController();
    let settled = false;
    const pending = hang(controller.signal).catch(() => {
      settled = true;
    });
    await jest.advanceTimersByTimeAsync(60_000);
    expect(settled).toBe(false);
    controller.abort();
    await pending;
    expect(settled).toBe(true);
  });
});
