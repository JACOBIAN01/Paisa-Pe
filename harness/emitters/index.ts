import type { AppEventMap, AppEventName } from '@pp/contracts-events';
import { appBus, type EventBus } from '@pp/core-event-bus';

export interface RecordedEvent {
  name: AppEventName;
  payload: unknown;
}

export interface EventRecorder {
  events: RecordedEvent[];
  /** Payloads of one event type, in emission order. */
  of<N extends AppEventName>(name: N): Array<AppEventMap[N]>;
  count(name: AppEventName): number;
  clear(): void;
  stop(): void;
}

const ALL_EVENTS: AppEventName[] = [
  'auth.sessionStarted',
  'auth.sessionEnded',
  'auth.tokenRefreshed',
  'lock.locked',
  'lock.unlocked',
  'payment.sent',
  'payment.received',
  'payment.failed',
  'balance.changed',
  'ledger.reconciled',
  'queue.enqueued',
  'queue.flushed',
  'sync.completed',
  'request.created',
  'request.updated',
  'reward.earned',
  'connectivity.changed',
  'notification.received',
  'notification.tapped',
  'deeplink.received',
  'flags.changed',
  'profile.changed',
];

/** Records everything emitted on a bus so tests can assert on it. */
export function recordEvents(
  bus: EventBus<AppEventMap> = appBus,
  names: AppEventName[] = ALL_EVENTS,
): EventRecorder {
  const events: RecordedEvent[] = [];
  const stops = names.map((name) =>
    bus.on(name, (payload) => {
      events.push({ name, payload });
    }),
  );
  return {
    events,
    of: <N extends AppEventName>(name: N) =>
      events.filter((e) => e.name === name).map((e) => e.payload as AppEventMap[N]),
    count: (name) => events.filter((e) => e.name === name).length,
    clear: () => {
      events.length = 0;
    },
    stop: () => stops.forEach((stop) => stop()),
  };
}

/** A tiny controllable event source for faking platform callbacks (AppState, links, taps). */
export function createEmitter<T>() {
  const listeners = new Set<(value: T) => void>();
  return {
    subscribe(listener: (value: T) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit(value: T): void {
      [...listeners].forEach((listener) => listener(value));
    },
    listenerCount: () => listeners.size,
  };
}
