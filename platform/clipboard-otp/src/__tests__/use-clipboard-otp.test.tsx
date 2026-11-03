import { act, renderHook } from '@testing-library/react-native';
import { createAppStateObserver, type AppStateStatus } from '@pp/platform-lifecycle';
import { useClipboardOtp } from '../use-clipboard-otp';

function fakeState(initial: AppStateStatus = 'active') {
  let state = initial;
  const listeners = new Set<(s: AppStateStatus) => void>();
  const adapter = {
    get currentState() {
      return state;
    },
    addEventListener: (_t: 'change', l: (s: AppStateStatus) => void) => {
      listeners.add(l);
      return { remove: () => void listeners.delete(l) };
    },
  };
  return {
    observer: createAppStateObserver(adapter),
    set: (s: AppStateStatus) => {
      state = s;
      listeners.forEach((l) => l(s));
    },
    count: () => listeners.size,
  };
}

const flush = () => act(async () => undefined);

describe('useClipboardOtp', () => {
  it('offers a clipboard OTP once and again only when it changes', async () => {
    let text = 'Your OTP is 123456';
    const state = fakeState();
    const onOtp = jest.fn();
    await renderHook(() =>
      useClipboardOtp({
        onOtp,
        enabled: true,
        clipboard: { getString: async () => text },
        observer: state.observer,
      }),
    );
    await flush();
    expect(onOtp).toHaveBeenCalledWith('123456');

    await act(async () => state.set('active'));
    expect(onOtp).toHaveBeenCalledTimes(1);

    text = 'OTP 654321';
    await act(async () => state.set('active'));
    expect(onOtp).toHaveBeenLastCalledWith('654321');
  });

  it('does nothing when disabled or when the clipboard is not an OTP', async () => {
    const state = fakeState();
    const onOtp = jest.fn();
    await renderHook(() =>
      useClipboardOtp({
        onOtp,
        enabled: false,
        clipboard: { getString: async () => '123456' },
        observer: state.observer,
      }),
    );
    await renderHook(() =>
      useClipboardOtp({
        onOtp,
        enabled: true,
        clipboard: { getString: async () => 'order 111111 and 222222' },
        observer: state.observer,
      }),
    );
    await flush();
    expect(onOtp).not.toHaveBeenCalled();
  });

  it('cleans up its listener and ignores late reads after unmount', async () => {
    const state = fakeState();
    const onOtp = jest.fn();
    let release: (v: string) => void = () => undefined;
    const clipboard = { getString: () => new Promise<string>((r) => (release = r)) };
    const { unmount } = await renderHook(() =>
      useClipboardOtp({ onOtp, enabled: true, clipboard, observer: state.observer }),
    );
    expect(state.count()).toBe(1);
    await unmount();
    expect(state.count()).toBe(0);
    release('123456');
    await flush();
    expect(onOtp).not.toHaveBeenCalled();
  });

  it('survives a clipboard read failure', async () => {
    const state = fakeState();
    const onOtp = jest.fn();
    await renderHook(() =>
      useClipboardOtp({
        onOtp,
        enabled: true,
        clipboard: { getString: async () => Promise.reject(new Error('denied')) },
        observer: state.observer,
      }),
    );
    await flush();
    expect(onOtp).not.toHaveBeenCalled();
  });
});
