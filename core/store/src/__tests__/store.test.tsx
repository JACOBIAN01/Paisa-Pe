import { act, renderHook } from '@testing-library/react-native';
import { createMemoryBackend } from '@pp/core-storage';
import { createPersistedStore, createStore, useHydrated, waitForHydration } from '../index';

interface Counter {
  count: number;
  secret: string;
  inc(): void;
}

const init = (set: (p: Partial<Counter> | ((s: Counter) => Partial<Counter>)) => void) => ({
  count: 0,
  secret: 's',
  inc: () => set((s) => ({ count: s.count + 1 })),
});

describe('createStore', () => {
  it('behaves like a zustand store', () => {
    const store = createStore<{ n: number; bump(): void }>((set) => ({
      n: 0,
      bump: () => set((s) => ({ n: s.n + 1 })),
    }));
    store.getState().bump();
    expect(store.getState().n).toBe(1);
  });
});

describe('createPersistedStore', () => {
  it('starts unhydrated and loads persisted state', async () => {
    const storage = createMemoryBackend({
      s: JSON.stringify({ state: { count: 7, secret: 'x' }, version: 0 }),
    });
    const store = createPersistedStore<Counter>({ name: 's', storage }, init);
    expect(store.getState().hydrated).toBe(false);
    expect(store.getState().count).toBe(0);
    await waitForHydration(store);
    expect(store.getState().hydrated).toBe(true);
    expect(store.getState().count).toBe(7);
  });

  it('persists changes without the hydrated flag and honours partialize', async () => {
    const storage = createMemoryBackend();
    const store = createPersistedStore<Counter>(
      { name: 'p', storage, partialize: ({ count }) => ({ count }) },
      init,
    );
    await waitForHydration(store);
    store.getState().inc();
    await new Promise((r) => setTimeout(r, 0));
    const saved = JSON.parse((await storage.getItem('p')) ?? '{}');
    expect(saved.state).toEqual({ count: 1 });
  });

  it('runs onRehydrated callbacks once, and immediately when already hydrated', async () => {
    const store = createPersistedStore<Counter>(
      { name: 'c', storage: createMemoryBackend() },
      init,
    );
    const cb = jest.fn();
    store.onRehydrated(cb);
    expect(cb).not.toHaveBeenCalled();
    await waitForHydration(store);
    expect(cb).toHaveBeenCalledTimes(1);
    const late = jest.fn();
    store.onRehydrated(late);
    expect(late).toHaveBeenCalledTimes(1);
  });

  it('lets callers unsubscribe before hydration', async () => {
    const store = createPersistedStore<Counter>(
      { name: 'u', storage: createMemoryBackend() },
      init,
    );
    const cb = jest.fn();
    store.onRehydrated(cb)();
    await waitForHydration(store);
    expect(cb).not.toHaveBeenCalled();
  });

  it('falls back to defaults and still hydrates when stored data is corrupt', async () => {
    const storage = createMemoryBackend({ bad: '{nope' });
    const store = createPersistedStore<Counter>({ name: 'bad', storage }, init);
    await waitForHydration(store);
    expect(store.getState().hydrated).toBe(true);
    expect(store.getState().count).toBe(0);
    expect(store.hydrationError()).toBeDefined();
  });

  it('migrates older persisted versions', async () => {
    const storage = createMemoryBackend({
      m: JSON.stringify({ state: { total: 4 }, version: 1 }),
    });
    const store = createPersistedStore<Counter>(
      {
        name: 'm',
        storage,
        version: 2,
        migrate: (persisted) => ({
          count: (persisted as { total: number }).total,
          secret: 'migrated',
          inc: () => undefined,
        }),
      },
      init,
    );
    await waitForHydration(store);
    expect(store.getState().count).toBe(4);
    expect(store.getState().secret).toBe('migrated');
  });

  it('exposes hydration to React', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const base = createMemoryBackend();
    const storage = {
      ...base,
      getItem: async (key: string) => {
        await gate;
        return base.getItem(key);
      },
    };
    const store = createPersistedStore<Counter>({ name: 'r', storage }, init);
    const { result } = await renderHook(() => useHydrated(store));
    expect(result.current).toBe(false);
    await act(async () => {
      release();
      await waitForHydration(store);
    });
    expect(result.current).toBe(true);
  });
});
