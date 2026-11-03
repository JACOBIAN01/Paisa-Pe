import { act, renderHook } from '@testing-library/react-native';
import { createAppStateObserver } from '../app-state';
import { usePrivacyShield } from '../privacy';
import { createFakeAppState } from './helpers';

describe('usePrivacyShield', () => {
  it('shields for inactive and background, clears on active', async () => {
    const fake = createFakeAppState();
    const observer = createAppStateObserver(fake);
    const { result, unmount } = await renderHook(() => usePrivacyShield(observer));
    expect(result.current).toBe(false);

    await act(async () => fake.set('inactive'));
    expect(result.current).toBe(true);
    await act(async () => fake.set('background'));
    expect(result.current).toBe(true);
    await act(async () => fake.set('active'));
    expect(result.current).toBe(false);

    await unmount();
    expect(fake.listenerCount()).toBe(0);
  });
});
