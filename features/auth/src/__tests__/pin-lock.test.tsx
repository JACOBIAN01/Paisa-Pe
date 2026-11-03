import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createTestApp, renderWithApp } from '@pp/harness';
import { lockStore } from '@pp/platform-lifecycle';
import { PIN_SERVICE } from '@pp/svc-auth';
import { PROFILE_SERVICE } from '@pp/svc-profile';
import { LockScreen, PinSetupScreen } from '../index';
import { TEST_PIN, enterPin } from './helpers';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
}));

const mockAuthenticate = jest.fn();
jest.mock('@pp/platform-biometrics', () => ({
  authenticateBiometric: (...args: unknown[]) => mockAuthenticate(...args),
  isBiometricAvailable: async () => true,
}));

describe('PIN setup', () => {
  beforeEach(() => jest.clearAllMocks());

  it('asks for the PIN twice and stores it', async () => {
    const app = await createTestApp();
    await renderWithApp(<PinSetupScreen />, { app });
    await enterPin(TEST_PIN);
    expect(screen.getByText('Confirm your PIN')).toBeTruthy();
    await enterPin(TEST_PIN);
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/home'));
    const pins = app.container.resolve(PIN_SERVICE);
    expect(await pins.isPinSet('usr_001')).toBe(true);
    expect(lockStore.getState().pinSet).toBe(true);
    app.dispose();
  });

  it('starts over when the confirmation does not match', async () => {
    const app = await createTestApp();
    await renderWithApp(<PinSetupScreen />, { app });
    await enterPin(TEST_PIN);
    await enterPin('1357');
    expect(screen.getByText('PINs do not match')).toBeTruthy();
    expect(screen.getByText('Create a 4-digit PIN')).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    app.dispose();
  });
});

describe('LockScreen', () => {
  async function lockedApp() {
    const app = await createTestApp();
    await app.container.resolve(PIN_SERVICE).setPin('usr_001', TEST_PIN);
    await act(async () => {
      lockStore.setState({ isLocked: true, pinSet: true, hydrated: true });
    });
    return app;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticate.mockResolvedValue('cancelled');
  });

  it('counts down attempts on a wrong PIN and unlocks on the right one', async () => {
    const app = await lockedApp();
    await renderWithApp(<LockScreen />, { app });
    await enterPin('1111');
    await waitFor(() => expect(screen.getByText(/Wrong PIN/)).toBeTruthy());
    expect(lockStore.getState().isLocked).toBe(true);

    await enterPin(TEST_PIN);
    await waitFor(() => expect(lockStore.getState().isLocked).toBe(false));
    app.dispose();
  });

  it('locks the PIN pad after repeated failures', async () => {
    const app = await lockedApp();
    await renderWithApp(<LockScreen />, { app });
    for (let i = 0; i < 4; i += 1) {
      await enterPin('1111');
      await waitFor(() =>
        expect(screen.getByText(`Wrong PIN. ${4 - i} attempts left`)).toBeTruthy(),
      );
    }
    await enterPin('1111');
    await waitFor(() => expect(screen.getByTestId('lockout-notice')).toBeTruthy());
    expect(lockStore.getState().isLocked).toBe(true);
    app.dispose();
  });

  it('unlocks only when biometrics report success', async () => {
    const app = await lockedApp();
    await app.container.resolve(PROFILE_SERVICE).updatePreferences({ biometricsEnabled: true });
    mockAuthenticate.mockResolvedValue('fallback');
    await renderWithApp(<LockScreen />, { app });
    await waitFor(() => expect(mockAuthenticate).toHaveBeenCalled());
    expect(lockStore.getState().isLocked).toBe(true);
    expect(screen.getByTestId('pin-key-1')).toBeTruthy();

    mockAuthenticate.mockResolvedValue('success');
    await fireEvent.press(screen.getByLabelText('Use biometrics'));
    await waitFor(() => expect(lockStore.getState().isLocked).toBe(false));
    app.dispose();
  });
});
