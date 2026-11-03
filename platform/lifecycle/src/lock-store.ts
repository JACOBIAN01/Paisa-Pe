import type { LockReason } from '@pp/contracts-events';
import { appBus } from '@pp/core-event-bus';
import { createPersistedStore, type PersistedStore } from '@pp/core-store';
import type { KeyValueStore } from '@pp/core-storage';

export type UnlockMethod = 'pin' | 'biometric';

export interface LockState {
  /** True from process start. Only a hydrated store with no PIN, or an explicit unlock, clears it. */
  isLocked: boolean;
  pinSet: boolean;
  lock(reason: LockReason): void;
  unlock(method: UnlockMethod): void;
  setPinSet(value: boolean): void;
}

export type LockStore = PersistedStore<LockState>;

export interface LockStoreDeps {
  storage?: KeyValueStore;
  name?: string;
  bus?: Pick<typeof appBus, 'emit'>;
}

export function createLockStore(deps: LockStoreDeps = {}): LockStore {
  const bus = deps.bus ?? appBus;

  const store: LockStore = createPersistedStore<LockState>(
    {
      name: deps.name ?? 'lock',
      storage: deps.storage,
      partialize: (state) => ({ pinSet: state.pinSet }),
    },
    (set, get) => ({
      isLocked: true,
      pinSet: false,
      lock: (reason) => {
        const { pinSet, isLocked } = get();
        if (!pinSet || isLocked) return;
        set({ isLocked: true });
        bus.emit('lock.locked', { reason });
      },
      unlock: (method) => {
        if (!store.getState().hydrated || !get().isLocked) return;
        set({ isLocked: false });
        bus.emit('lock.unlocked', { method });
      },
      setPinSet: (value) => set(value ? { pinSet: true } : { pinSet: false, isLocked: false }),
    }),
  );

  store.onRehydrated(() => {
    if (store.hydrationError() !== undefined) return;
    if (store.getState().pinSet) bus.emit('lock.locked', { reason: 'cold_start' });
    else store.setState({ isLocked: false });
  });

  return store;
}

export const lockStore: LockStore = createLockStore();

/** Reports locked until persisted state has been read, so nothing renders early. */
export function useIsLocked(store: LockStore = lockStore): boolean {
  return store((state) => !state.hydrated || state.isLocked);
}
