import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { appStorage, type KeyValueStore } from '@pp/core-storage';

export interface Hydration {
  /** False until persisted state has been read. Treat state as untrusted until then. */
  hydrated: boolean;
}

export type SetState<T> = (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
export type Initializer<T> = (set: SetState<T>, get: () => T) => T;

export interface PersistedStoreOptions<T> {
  /** Storage key for this store. */
  name: string;
  storage?: KeyValueStore;
  partialize?: (state: T) => Partial<T>;
  version?: number;
  migrate?: (persisted: unknown, fromVersion: number) => T | Promise<T>;
}

export type PersistedStore<T> = UseBoundStore<StoreApi<T & Hydration>> & {
  /** Runs `cb` once hydration has finished (immediately if it already has). */
  onRehydrated(cb: () => void): () => void;
  /** The error that interrupted hydration, if any. Defaults apply when this is set. */
  hydrationError(): unknown;
};

const toStateStorage = (store: KeyValueStore): StateStorage => ({
  getItem: (name) => store.getItem(name),
  setItem: (name, value) => store.setItem(name, value),
  removeItem: (name) => store.removeItem(name),
});

export function createPersistedStore<T extends object>(
  options: PersistedStoreOptions<T>,
  initializer: Initializer<T>,
): PersistedStore<T> {
  type S = T & Hydration;
  const listeners = new Set<() => void>();
  let failure: unknown;

  const store = create<S>()(
    persist<S, [], [], Partial<T>>(
      (set, get) => ({
        ...initializer(set as SetState<T>, get as () => T),
        hydrated: false,
      }),
      {
        name: options.name,
        version: options.version ?? 0,
        storage: createJSONStorage(() => toStateStorage(options.storage ?? appStorage)),
        partialize: (state) => {
          const { hydrated: _hydrated, ...rest } = state;
          return options.partialize
            ? options.partialize(rest as unknown as T)
            : (rest as Partial<T>);
        },
        migrate: options.migrate
          ? (persisted, fromVersion) => options.migrate!(persisted, fromVersion) as Promise<S>
          : undefined,
        onRehydrateStorage: () => (_state, error) => {
          if (error === undefined) return;
          failure = error;
          markHydrated();
        },
      },
    ),
  );

  function markHydrated(): void {
    if (store.getState().hydrated) return;
    store.setState({ hydrated: true } as Partial<S>);
    for (const cb of [...listeners]) cb();
    listeners.clear();
  }

  if (store.persist.hasHydrated()) markHydrated();
  else store.persist.onFinishHydration(markHydrated);

  const bound = store as unknown as PersistedStore<T>;
  bound.onRehydrated = (cb) => {
    if (store.getState().hydrated) {
      cb();
      return () => undefined;
    }
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  };
  bound.hydrationError = () => failure;
  return bound;
}
