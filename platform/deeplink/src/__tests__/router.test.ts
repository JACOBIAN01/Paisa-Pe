import { createMemorySink, resetSink, setSink } from '@pp/core-logging';
import type { LinkingAdapter } from '../linking';
import { createDeepLinkRouter } from '../router';

const PAY = 'paisape://pay?to=%2B919812345678&amount=100';

function setup(opts: { initial?: string | null; ready?: boolean; locked?: boolean } = {}) {
  const handlers = new Set<(e: { url: string }) => void>();
  const linking: LinkingAdapter = {
    getInitialURL: jest.fn(async () => opts.initial ?? null),
    addEventListener: (_t, h) => {
      handlers.add(h);
      return { remove: () => void handlers.delete(h) };
    },
  };
  const state = { ready: opts.ready ?? true, locked: opts.locked ?? false };
  let notify: () => void = () => undefined;
  const navigate = jest.fn();
  const bus = { emit: jest.fn() };
  const unsubscribe = jest.fn();
  const router = createDeepLinkRouter({
    linking,
    navigate,
    isReady: () => state.ready,
    isLocked: () => state.locked,
    subscribeUnlock: (cb) => {
      notify = cb;
      return unsubscribe;
    },
    bus,
  });
  return {
    router,
    state,
    navigate,
    bus,
    handlers,
    unsubscribe,
    changed: () => notify(),
    emit: (url: string) => handlers.forEach((h) => h({ url })),
  };
}

describe('deep link router', () => {
  beforeEach(() => setSink(createMemorySink()));
  afterEach(() => resetSink());

  it('navigates for a warm link when ready and unlocked', async () => {
    const t = setup();
    await t.router.start();
    t.emit(PAY);
    expect(t.navigate).toHaveBeenCalledWith('send-confirm', {
      to: '+919812345678',
      amount: '100',
    });
    expect(t.bus.emit).toHaveBeenCalledWith('deeplink.received', { url: PAY, source: 'warm' });
  });

  it('holds a cold-start link until hydrated and unlocked', async () => {
    const t = setup({ initial: PAY, ready: false, locked: true });
    await t.router.start();
    expect(t.navigate).not.toHaveBeenCalled();
    expect(t.router.pending()).toBe(1);

    t.state.ready = true;
    t.changed();
    expect(t.navigate).not.toHaveBeenCalled();

    t.state.locked = false;
    t.changed();
    expect(t.navigate).toHaveBeenCalledTimes(1);
    expect(t.router.pending()).toBe(0);
    expect(t.bus.emit).toHaveBeenCalledWith('deeplink.received', { url: PAY, source: 'cold' });
  });

  it('keeps only the latest waiting link', async () => {
    const t = setup({ locked: true });
    await t.router.start();
    t.emit(PAY);
    t.emit('paisape://rewards');
    t.state.locked = false;
    t.changed();
    expect(t.navigate).toHaveBeenCalledTimes(1);
    expect(t.navigate).toHaveBeenCalledWith('rewards', {});
  });

  it('drops invalid links without emitting', async () => {
    const t = setup();
    await t.router.start();
    t.emit('paisape://nope');
    expect(t.navigate).not.toHaveBeenCalled();
    expect(t.bus.emit).not.toHaveBeenCalled();
  });

  it('reads the initial URL once and registers one listener', async () => {
    const t = setup({ initial: 'paisape://home' });
    await t.router.start();
    await t.router.start();
    expect(t.handlers.size).toBe(1);
    expect(t.navigate).toHaveBeenCalledTimes(1);
  });

  it('removes listeners on dispose and ignores later links', async () => {
    const t = setup({ locked: true });
    await t.router.start();
    t.emit(PAY);
    t.router.dispose();
    expect(t.handlers.size).toBe(0);
    expect(t.unsubscribe).toHaveBeenCalled();
    expect(t.router.pending()).toBe(0);
    t.state.locked = false;
    t.changed();
    expect(t.navigate).not.toHaveBeenCalled();
  });

  it('survives a throwing navigate', async () => {
    const t = setup();
    t.navigate.mockImplementation(() => {
      throw new Error('no navigator');
    });
    await t.router.start();
    expect(() => t.emit('paisape://home')).not.toThrow();
  });
});
