import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { formatPaise, paise } from '@pp/core-money';
import { LoginScreen, OtpScreen, PinSetupScreen } from '@pp/feat-auth';
import { HomeScreen } from '@pp/feat-home';
import { lockStore } from '@pp/platform-lifecycle';
import {
  AppShell,
  DEMO_OTP,
  createNav,
  createTestApp,
  phoneOf,
  recordEvents,
  renderWithApp,
} from '@pp/harness';

const mockNav = createNav('/login');
jest.mock('expo-router', () => ({
  useRouter: () => mockNav.router,
  useLocalSearchParams: () => mockNav.params(),
}));
jest.mock('expo-clipboard', () => ({ getStringAsync: async () => '' }));

const PIN = '2468';
const enterPin = async (pin: string): Promise<void> => {
  for (const digit of pin) await fireEvent.press(screen.getByTestId(`pin-key-${digit}`));
};

const shell = (
  <AppShell
    nav={mockNav}
    screens={{
      '/login': <LoginScreen />,
      '/otp': <OtpScreen />,
      '/pin-setup': <PinSetupScreen />,
      '/home': <HomeScreen />,
    }}
  />
);

describe('scenario: a returning user signs in, sets a PIN and lands on home', () => {
  it('walks login -> OTP -> PIN setup -> home', async () => {
    const app = await createTestApp({ loggedIn: false });
    const events = recordEvents();
    const view = await renderWithApp(shell, { app });
    expect(screen.getByTestId('login-phone')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('login-phone'), phoneOf('usr_001').slice(3));
    await fireEvent.press(screen.getByTestId('login-submit'));
    await waitFor(() => expect(mockNav.location().path).toBe('/otp'));

    await fireEvent.changeText(screen.getByTestId('otp-input'), DEMO_OTP);
    await fireEvent.press(screen.getByTestId('otp-verify'));
    await waitFor(() => expect(mockNav.location().path).toBe('/pin-setup'));
    expect(app.userId()).toBe('usr_001');

    // The app root re-renders with the signed-in user's services once they exist.
    await waitFor(() => expect(app.container).not.toBe(app.root));
    await view.rerender(shell);

    await enterPin(PIN);
    expect(screen.getByText('Confirm your PIN')).toBeTruthy();
    await enterPin(PIN);
    await waitFor(() => expect(mockNav.location().path).toBe('/home'));

    expect(await app.pin.isPinSet('usr_001')).toBe(true);
    expect(lockStore.getState().pinSet).toBe(true);
    expect(lockStore.getState().isLocked).toBe(false);
    expect(events.count('auth.sessionStarted')).toBeGreaterThan(0);

    const expected = formatPaise(paise(app.admin.getBalance('usr_001').balance));
    await waitFor(() => expect(screen.getByTestId('home-balance').props.children).toBe(expected));
    expect(screen.getByText('Hello, Aarav Sharma')).toBeTruthy();

    events.stop();
    await screen.unmount();
    app.dispose();
  });

  it('keeps the user on the code screen when the code is wrong', async () => {
    const app = await createTestApp({ loggedIn: false });
    const challenge = await app.auth.requestOtp(phoneOf('usr_001'));
    mockNav.router.replace({
      pathname: '/otp',
      params: { otpId: challenge.otpId, phone: phoneOf('usr_001'), resendAfterSec: '30' },
    });
    await renderWithApp(shell, { app });

    await fireEvent.changeText(screen.getByTestId('otp-input'), '000000');
    await fireEvent.press(screen.getByTestId('otp-verify'));
    await waitFor(() => expect(screen.getByText('That code is not right')).toBeTruthy());
    expect(mockNav.location().path).toBe('/otp');
    expect(app.userId()).toBeNull();
    await screen.unmount();
    app.dispose();
  });
});
