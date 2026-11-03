import { appBus, type Unsubscribe } from '@pp/core-event-bus';
import { every, getClock, type Cancel, type Clock } from '@pp/core-time';
import { createFetchProbe, type Probe } from './probe';

export interface ConnectivityOptions {
  probe: Probe;
  intervalMs: number;
  clock?: Clock;
  bus?: Pick<typeof appBus, 'emit'>;
}

export interface Connectivity {
  isOnline(): boolean;
  subscribe(listener: (online: boolean) => void): Unsubscribe;
  start(): void;
  stop(): void;
  checkNow(): Promise<boolean>;
  lastCheckedAt(): number | null;
}

export function createConnectivity(options: ConnectivityOptions): Connectivity {
  const bus = options.bus ?? appBus;
  const clock = options.clock ?? getClock();
  const listeners = new Set<{ fn: (online: boolean) => void }>();
  let online = true;
  let checkedAt: number | null = null;
  let inFlight: Promise<boolean> | null = null;
  let cancel: Cancel | null = null;

  const apply = (next: boolean): void => {
    checkedAt = clock.now();
    if (next === online) return;
    online = next;
    bus.emit('connectivity.changed', { online });
    for (const entry of [...listeners]) {
      if (listeners.has(entry)) entry.fn(online);
    }
  };

  const checkNow = (): Promise<boolean> => {
    if (inFlight) return inFlight;
    inFlight = options
      .probe()
      .catch(() => false)
      .then((result) => {
        apply(result);
        return result;
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };

  return {
    isOnline: () => online,
    subscribe(fn) {
      const entry = { fn };
      listeners.add(entry);
      return () => void listeners.delete(entry);
    },
    start() {
      if (cancel) return;
      void checkNow();
      cancel = every(options.intervalMs, () => void checkNow());
    },
    stop() {
      cancel?.();
      cancel = null;
    },
    checkNow,
    lastCheckedAt: () => checkedAt,
  };
}

export const appConnectivity: Connectivity = createConnectivity({
  probe: createFetchProbe(),
  intervalMs: 15_000,
});
