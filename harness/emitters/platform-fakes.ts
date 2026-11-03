import type { ClipboardAdapter } from '@pp/platform-clipboard-otp';
import type { LinkingAdapter } from '@pp/platform-deeplink';
import type { AppStateAdapter, AppStateListener, AppStateStatus } from '@pp/platform-lifecycle';
import type { NotificationsAdapter, TapResponse } from '@pp/platform-notifications';

export interface FakeAppState extends AppStateAdapter {
  /** Moves the app to `state` and tells every listener. */
  set(state: AppStateStatus): void;
  listenerCount(): number;
}

/** Stand-in for React Native's AppState. Hand it to `createAppStateObserver`. */
export function createFakeAppState(initial: AppStateStatus = 'active'): FakeAppState {
  let state = initial;
  const listeners = new Set<AppStateListener>();
  return {
    get currentState() {
      return state;
    },
    addEventListener(_type, listener) {
      listeners.add(listener);
      return { remove: () => void listeners.delete(listener) };
    },
    set(next) {
      state = next;
      for (const listener of [...listeners]) listener(next);
    },
    listenerCount: () => listeners.size,
  };
}

export interface FakeLinking extends LinkingAdapter {
  /** Delivers a link while the app is running. */
  emit(url: string): void;
  listenerCount(): number;
}

/** Stand-in for expo-linking. `initialUrl` is the link that launched the app, if any. */
export function createFakeLinking(initialUrl: string | null = null): FakeLinking {
  const handlers = new Set<(event: { url: string }) => void>();
  return {
    getInitialURL: async () => initialUrl,
    addEventListener(_type, handler) {
      handlers.add(handler);
      return { remove: () => void handlers.delete(handler) };
    },
    emit: (url) => handlers.forEach((handler) => handler({ url })),
    listenerCount: () => handlers.size,
  };
}

export interface FakeNotifications extends NotificationsAdapter {
  scheduled: Array<{ title: string; body: string; data: Record<string, unknown>; at: number }>;
  /** Simulates the user tapping a notification whose payload carries `route`. */
  tap(id: string, route: unknown): void;
  listenerCount(): number;
}

export const tapResponse = (id: string, route: unknown): TapResponse => ({
  notification: {
    request: { identifier: id, content: { data: { route } as Record<string, unknown> } },
  },
});

/** Stand-in for expo-notifications. */
export function createFakeNotifications(): FakeNotifications {
  const listeners = new Set<(response: TapResponse) => void>();
  const scheduled: FakeNotifications['scheduled'] = [];
  return {
    scheduled,
    schedule: async (request) => {
      scheduled.push(request);
      return `n${scheduled.length}`;
    },
    addTapListener(listener) {
      listeners.add(listener);
      return { remove: () => void listeners.delete(listener) };
    },
    getLastTap: () => null,
    tap: (id, route) => listeners.forEach((listener) => listener(tapResponse(id, route))),
    listenerCount: () => listeners.size,
  };
}

export interface FakeClipboard extends ClipboardAdapter {
  set(text: string): void;
  reads(): number;
}

/** Stand-in for the system clipboard. */
export function createFakeClipboard(initial = ''): FakeClipboard {
  let text = initial;
  let reads = 0;
  return {
    getString: async () => {
      reads += 1;
      return text;
    },
    set: (next) => {
      text = next;
    },
    reads: () => reads,
  };
}
