import { createMemoryBackend } from '@pp/core-storage';
import { waitForHydration } from '@pp/core-store';
import { createLockController } from '../lock-controller';
import { createLockStore } from '../lock-store';
import { createAppStateObserver } from '../app-state';
import { createFakeAppState, createFakeClock } from './helpers';

async function setup(timeoutMs: number, initial: 'active' | 'background' = 'active') {
  const fake = createFakeAppState(initial);
  const clock = createFakeClock();
  const store = createLockStore({ storage: createMemoryBackend(), bus: { emit: jest.fn() } });
  await waitForHydration(store);
  store.getState().setPinSet(true);
  store.getState().unlock('pin');
  const controller = createLockController({
    observer: createAppStateObserver(fake),
    lockStore: store,
    getTimeoutMs: () => timeoutMs,
    clock,
  });
  return { fake, clock, store, controller };
}

describe('lock controller', () => {
  it('locks after returning from background past the timeout', async () => {
    const { fake, clock, store } = await setup(30_000);
    fake.set('inactive');
    fake.set('background');
    clock.advance(31_000);
    fake.set('active');
    expect(store.getState().isLocked).toBe(true);
  });

  it('does not lock for a short absence', async () => {
    const { fake, clock, store } = await setup(30_000);
    fake.set('background');
    clock.advance(10_000);
    fake.set('active');
    expect(store.getState().isLocked).toBe(false);
  });

  it('is not extended by inactive transitions', async () => {
    const { fake, clock, store } = await setup(30_000);
    fake.set('background');
    clock.advance(20_000);
    fake.set('inactive');
    clock.advance(11_000);
    fake.set('active');
    expect(store.getState().isLocked).toBe(true);
  });

  it('ignores inactive-only excursions such as a biometric prompt', async () => {
    const { fake, clock, store } = await setup(30_000);
    fake.set('inactive');
    clock.advance(120_000);
    fake.set('active');
    expect(store.getState().isLocked).toBe(false);
  });

  it('uses the monotonic clock, not the wall clock', async () => {
    const { fake, clock, store } = await setup(30_000);
    fake.set('background');
    clock.jumpWall(-3_600_000);
    clock.advance(31_000);
    fake.set('active');
    expect(store.getState().isLocked).toBe(true);

    store.getState().unlock('pin');
    fake.set('background');
    clock.jumpWall(3_600_000);
    clock.advance(1_000);
    fake.set('active');
    expect(store.getState().isLocked).toBe(false);
  });

  it('locks immediately on background when the timeout is zero', async () => {
    const { fake, store } = await setup(0);
    fake.set('background');
    expect(store.getState().isLocked).toBe(true);
  });

  it('accounts for an app that starts in the background', async () => {
    const { fake, clock, store } = await setup(5_000, 'background');
    clock.advance(6_000);
    fake.set('active');
    expect(store.getState().isLocked).toBe(true);
  });

  it('stops listening after dispose', async () => {
    const { fake, clock, store, controller } = await setup(1_000);
    controller.dispose();
    expect(fake.listenerCount()).toBe(0);
    fake.set('background');
    clock.advance(5_000);
    fake.set('active');
    expect(store.getState().isLocked).toBe(false);
  });
});
