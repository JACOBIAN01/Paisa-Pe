import type { Hydration, PersistedStore } from './persisted-store';

export function waitForHydration<T extends object>(store: PersistedStore<T>): Promise<void> {
  return new Promise((resolve) => {
    store.onRehydrated(resolve);
  });
}

/** React hook: true once the store has read its persisted state. */
export function useHydrated<T extends object>(store: PersistedStore<T>): boolean {
  return store((state: T & Hydration) => state.hydrated);
}
