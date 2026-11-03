import { act, renderHook } from '@testing-library/react-native';
import { createFakeNotifications, tap } from './helpers';
import { useNotificationTaps } from '../use-notification-taps';

describe('useNotificationTaps', () => {
  it('routes live taps and removes the listener on unmount', async () => {
    const fake = createFakeNotifications();
    const navigate = jest.fn();
    const { unmount } = await renderHook(() => useNotificationTaps(navigate, fake));
    expect(fake.listeners()).toBe(1);

    await act(async () => fake.emit(tap('a', { name: 'home' })));
    expect(navigate).toHaveBeenCalledWith('home', {});

    await unmount();
    expect(fake.listeners()).toBe(0);
  });

  it('routes the launch tap once and ignores repeats', async () => {
    const fake = createFakeNotifications();
    const launch = tap('boot', { name: 'rewards' });
    fake.setLast(launch);
    const navigate = jest.fn();
    await renderHook(() => useNotificationTaps(navigate, fake));
    await act(async () => fake.emit(launch));
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('uses the latest navigate without resubscribing', async () => {
    const fake = createFakeNotifications();
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = await renderHook(
      (props: { nav: typeof first }) => useNotificationTaps(props.nav, fake),
      { initialProps: { nav: first } },
    );
    await rerender({ nav: second });
    expect(fake.listeners()).toBe(1);
    await act(async () => fake.emit(tap('x', { name: 'home' })));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalled();
  });
});
