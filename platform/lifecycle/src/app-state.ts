import { AppState } from 'react-native';
import type { Unsubscribe } from '@pp/core-event-bus';

export type AppStateStatus = 'active' | 'inactive' | 'background' | 'unknown' | 'extension';
export type AppStateListener = (state: AppStateStatus) => void;

export interface AppStateSubscription {
  remove(): void;
}

export interface AppStateAdapter {
  readonly currentState: AppStateStatus;
  addEventListener(type: 'change', listener: AppStateListener): AppStateSubscription;
}

export const reactNativeAppState: AppStateAdapter = {
  get currentState() {
    return AppState.currentState;
  },
  addEventListener: (type, listener) => AppState.addEventListener(type, listener),
};

export interface AppStateObserver {
  current(): AppStateStatus;
  subscribe(listener: AppStateListener): Unsubscribe;
}

/** One native listener is shared by all subscribers and removed when the last one leaves. */
export function createAppStateObserver(
  adapter: AppStateAdapter = reactNativeAppState,
): AppStateObserver {
  const entries = new Set<{ listener: AppStateListener }>();
  let native: AppStateSubscription | null = null;
  let last: AppStateStatus = adapter.currentState;

  const attach = (): void => {
    if (native) return;
    last = adapter.currentState;
    native = adapter.addEventListener('change', (state) => {
      last = state;
      for (const entry of [...entries]) {
        if (entries.has(entry)) entry.listener(state);
      }
    });
  };

  const detach = (): void => {
    native?.remove();
    native = null;
  };

  return {
    current: () => (native ? last : adapter.currentState),
    subscribe(listener) {
      const entry = { listener };
      entries.add(entry);
      attach();
      return () => {
        if (!entries.delete(entry)) return;
        if (entries.size === 0) detach();
      };
    },
  };
}

export const appStateObserver = createAppStateObserver();
