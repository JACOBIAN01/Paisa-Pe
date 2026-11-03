import { act, renderHook } from '@testing-library/react-native';
import { createConnectivity } from '../connectivity';
import { createFetchProbe } from '../probe';
import { useIsOnline } from '../use-is-online';

const clock = { now: () => 42, monotonic: () => 0 };

function setup(results: boolean[]) {
  const queue = [...results];
  const probe = jest.fn(async () => queue.shift() ?? true);
  const bus = { emit: jest.fn() };
  const connectivity = createConnectivity({ probe, intervalMs: 1_000, clock, bus });
  return { probe, bus, connectivity };
}

describe('connectivity', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('emits only when the state changes', async () => {
    const { connectivity, bus } = setup([true, false, false, true]);
    const seen: boolean[] = [];
    connectivity.subscribe((o) => seen.push(o));
    for (let i = 0; i < 4; i += 1) await connectivity.checkNow();
    expect(seen).toEqual([false, true]);
    expect(bus.emit.mock.calls).toEqual([
      ['connectivity.changed', { online: false }],
      ['connectivity.changed', { online: true }],
    ]);
    expect(connectivity.lastCheckedAt()).toBe(42);
  });

  it('shares an in-flight check', async () => {
    const { connectivity, probe } = setup([false]);
    const [a, b] = await Promise.all([connectivity.checkNow(), connectivity.checkNow()]);
    expect([a, b]).toEqual([false, false]);
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('treats a throwing probe as offline', async () => {
    const connectivity = createConnectivity({
      probe: async () => {
        throw new Error('boom');
      },
      intervalMs: 1_000,
      bus: { emit: jest.fn() },
    });
    expect(await connectivity.checkNow()).toBe(false);
    expect(connectivity.isOnline()).toBe(false);
  });

  it('polls while started and stops cleanly', async () => {
    const { connectivity, probe } = setup([]);
    connectivity.start();
    connectivity.start();
    await jest.advanceTimersByTimeAsync(3_000);
    expect(probe).toHaveBeenCalledTimes(4);
    connectivity.stop();
    await jest.advanceTimersByTimeAsync(5_000);
    expect(probe).toHaveBeenCalledTimes(4);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('stops notifying unsubscribed listeners', async () => {
    const { connectivity } = setup([false]);
    const fn = jest.fn();
    connectivity.subscribe(fn)();
    await connectivity.checkNow();
    expect(fn).not.toHaveBeenCalled();
  });

  it('drives useIsOnline', async () => {
    const { connectivity } = setup([false]);
    const { result } = await renderHook(() => useIsOnline(connectivity));
    expect(result.current).toBe(true);
    await act(async () => {
      await connectivity.checkNow();
    });
    expect(result.current).toBe(false);
  });
});

describe('fetch probe', () => {
  it('is online on any response and offline on failure', async () => {
    const ok = createFetchProbe({ fetchImpl: async () => ({ status: 503 }) });
    expect(await ok()).toBe(true);
    const bad = createFetchProbe({
      fetchImpl: async () => {
        throw new TypeError('Network request failed');
      },
    });
    expect(await bad()).toBe(false);
  });

  it('aborts after the timeout and clears its timer', async () => {
    jest.useFakeTimers();
    const probe = createFetchProbe({
      timeoutMs: 100,
      fetchImpl: (_u, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    });
    const result = probe();
    await jest.advanceTimersByTimeAsync(100);
    expect(await result).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });
});
