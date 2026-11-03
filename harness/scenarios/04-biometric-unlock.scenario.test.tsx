import { Text } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { lockStore } from '@pp/platform-lifecycle';
import { PROFILE_SERVICE } from '@pp/svc-profile';
import {
  AppShell,
  createNav,
  createTestApp,
  recordEvents,
  renderWithApp,
  type TestApp,
} from '@pp/harness';

const mockNav = createNav('/');
jest.mock('expo-router', () => ({
  useRouter: () => mockNav.router,
  useLocalSearchParams: () => mockNav.params(),
}));

const mockAuthenticate = jest.fn();
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: async () => true,
  isEnrolledAsync: async () => true,
  authenticateAsync: (options: unknown) => mockAuthenticate(options),
}));

const PIN = '2468';
const shell = <AppShell nav={mockNav} screens={{ '/': <Text testID="content">content</Text> }} />;

async function lockedApp(): Promise<TestApp> {
  const app = await createTestApp();
  await app.pin.setPin('usr_001', PIN);
  await app.container.resolve(PROFILE_SERVICE).updatePreferences({ biometricsEnabled: true });
  await act(async () => {
    lockStore.setState({ isLocked: true, pinSet: true, hydrated: true });
  });
  return app;
}

beforeEach(() => mockAuthenticate.mockReset());

describe('scenario: biometric unlock', () => {
  it('unlocks when the device confirms the user', async () => {
    mockAuthenticate.mockResolvedValue({ success: true });
    const app = await lockedApp();
    const events = recordEvents();
    await renderWithApp(shell, { app });
    await waitFor(() => expect(screen.getByTestId('content')).toBeTruthy());
    expect(events.of('lock.unlocked')).toEqual([{ method: 'biometric' }]);
    events.stop();
    await screen.unmount();
    app.dispose();
  });

  it('falls back to the PIN pad when the user chooses the fallback', async () => {
    mockAuthenticate.mockResolvedValue({ success: false, error: 'user_fallback' });
    const app = await lockedApp();
    const events = recordEvents();
    await renderWithApp(shell, { app });
    await waitFor(() => expect(mockAuthenticate).toHaveBeenCalledTimes(1));

    expect(screen.getByTestId('lock-screen')).toBeTruthy();
    expect(screen.queryByTestId('content')).toBeNull();
    expect(lockStore.getState().isLocked).toBe(true);
    expect(events.count('lock.unlocked')).toBe(0);

    for (const digit of PIN) await fireEvent.press(screen.getByTestId(`pin-key-${digit}`));
    await waitFor(() => expect(screen.getByTestId('content')).toBeTruthy());
    expect(events.of('lock.unlocked')).toEqual([{ method: 'pin' }]);
    events.stop();
    await screen.unmount();
    app.dispose();
  });

  it.each(['user_cancel', 'system_cancel', 'not_enrolled', 'lockout'])(
    'stays locked when the prompt ends with %s',
    async (error) => {
      mockAuthenticate.mockResolvedValue({ success: false, error });
      const app = await lockedApp();
      await renderWithApp(shell, { app });
      await waitFor(() => expect(mockAuthenticate).toHaveBeenCalled());
      expect(screen.getByTestId('pin-key-1')).toBeTruthy();
      expect(screen.queryByTestId('content')).toBeNull();
      expect(lockStore.getState().isLocked).toBe(true);
      await screen.unmount();
      app.dispose();
    },
  );

  it('lets the user try biometrics again from the lock screen', async () => {
    mockAuthenticate.mockResolvedValueOnce({ success: false, error: 'user_cancel' });
    const app = await lockedApp();
    await renderWithApp(shell, { app });
    await waitFor(() => expect(mockAuthenticate).toHaveBeenCalledTimes(1));

    mockAuthenticate.mockResolvedValue({ success: true });
    await fireEvent.press(screen.getByLabelText('Use biometrics'));
    await waitFor(() => expect(screen.getByTestId('content')).toBeTruthy());
    await screen.unmount();
    app.dispose();
  });
});
