import { createMemoryBackend } from '@pp/core-storage';
import { waitForHydration } from '@pp/core-store';
import { createLockStore } from '../lock-store';

const bus = () => ({ emit: jest.fn() });

describe('lock store', () => {
  it('is locked before hydration and unlocked afterwards when no PIN is set', async () => {
    const store = createLockStore({ storage: createMemoryBackend(), bus: bus() });
    expect(store.getState().isLocked).toBe(true);
    expect(store.getState().hydrated).toBe(false);
    await waitForHydration(store);
    expect(store.getState().isLocked).toBe(false);
  });

  it('stays locked after a cold start when a PIN was set', async () => {
    const storage = createMemoryBackend();
    const first = createLockStore({ storage, bus: bus() });
    await waitForHydration(first);
    first.getState().setPinSet(true);
    await new Promise((r) => setTimeout(r, 0));

    const events = bus();
    const second = createLockStore({ storage, bus: events });
    await waitForHydration(second);
    expect(second.getState().pinSet).toBe(true);
    expect(second.getState().isLocked).toBe(true);
    expect(events.emit).toHaveBeenCalledWith('lock.locked', { reason: 'cold_start' });
  });

  it('ignores unlock before hydration', () => {
    const store = createLockStore({ storage: createMemoryBackend(), bus: bus() });
    store.getState().unlock('pin');
    expect(store.getState().isLocked).toBe(true);
  });

  it('locks and unlocks with events, only when a PIN is set', async () => {
    const events = bus();
    const store = createLockStore({ storage: createMemoryBackend(), bus: events });
    await waitForHydration(store);

    store.getState().lock('manual');
    expect(store.getState().isLocked).toBe(false);

    store.getState().setPinSet(true);
    store.getState().lock('manual');
    expect(store.getState().isLocked).toBe(true);
    store.getState().lock('manual');
    store.getState().unlock('biometric');
    store.getState().unlock('biometric');

    expect(events.emit.mock.calls).toEqual([
      ['lock.locked', { reason: 'manual' }],
      ['lock.unlocked', { method: 'biometric' }],
    ]);
  });

  it('unlocks when the PIN is removed', async () => {
    const store = createLockStore({ storage: createMemoryBackend(), bus: bus() });
    await waitForHydration(store);
    store.getState().setPinSet(true);
    store.getState().lock('manual');
    store.getState().setPinSet(false);
    expect(store.getState().isLocked).toBe(false);
  });

  it('fails closed when storage cannot be read', async () => {
    const broken = {
      ...createMemoryBackend(),
      getItem: () => Promise.reject(new Error('disk')),
    };
    const store = createLockStore({ storage: broken, bus: bus() });
    await waitForHydration(store);
    expect(store.hydrationError()).toBeDefined();
    expect(store.getState().isLocked).toBe(true);
  });
});
