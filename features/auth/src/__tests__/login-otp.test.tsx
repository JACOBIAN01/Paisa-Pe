import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { DEMO_OTP, createTestApp, phoneOf, renderWithApp } from '@pp/harness';
import { LoginScreen, OtpScreen } from '../index';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

describe('login and OTP', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
  });

  it('disables sending until the mobile number is valid', async () => {
    const app = await createTestApp({ loggedIn: false });
    await renderWithApp(<LoginScreen />, { app });
    const button = screen.getByTestId('login-submit');
    expect(button.props.accessibilityState?.disabled).toBe(true);
    await fireEvent.changeText(screen.getByTestId('login-phone'), '12345');
    expect(screen.getByTestId('login-submit').props.accessibilityState?.disabled).toBe(true);
    app.dispose();
  });

  it('requests an OTP and opens the code screen', async () => {
    const app = await createTestApp({ loggedIn: false });
    await renderWithApp(<LoginScreen />, { app });
    await fireEvent.changeText(screen.getByTestId('login-phone'), phoneOf('usr_001').slice(3));
    await fireEvent.press(screen.getByTestId('login-submit'));
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalled());
    const call = mockRouter.push.mock.calls[0]?.[0] as {
      pathname: string;
      params: Record<string, string>;
    };
    expect(call.pathname).toBe('/otp');
    expect(call.params.phone).toBe(phoneOf('usr_001'));
    expect(call.params.otpId).toBeTruthy();
    app.dispose();
  });

  it('shows an error for a wrong code and signs in with the right one', async () => {
    const app = await createTestApp({ loggedIn: false });
    const challenge = await app.auth.requestOtp(phoneOf('usr_001'));
    mockParams = { otpId: challenge.otpId, phone: phoneOf('usr_001'), resendAfterSec: '30' };
    await renderWithApp(<OtpScreen />, { app });

    await fireEvent.changeText(screen.getByTestId('otp-input'), '000000');
    await fireEvent.press(screen.getByTestId('otp-verify'));
    await waitFor(() => expect(screen.getByText('That code is not right')).toBeTruthy());
    expect(mockRouter.replace).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('otp-input'), DEMO_OTP);
    await fireEvent.press(screen.getByTestId('otp-verify'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
    expect(app.userId()).toBe('usr_001');
    app.dispose();
  });
});
