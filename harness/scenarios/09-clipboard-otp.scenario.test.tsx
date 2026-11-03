import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { OtpScreen } from '@pp/feat-auth';
import {
  DEMO_OTP,
  createFakeClipboard,
  createNav,
  createTestApp,
  phoneOf,
  renderWithApp,
  type TestApp,
} from '@pp/harness';

const mockNav = createNav('/otp');
const mockClipboard = createFakeClipboard();
jest.mock('expo-router', () => ({
  useRouter: () => mockNav.router,
  useLocalSearchParams: () => mockNav.params(),
}));
jest.mock('expo-clipboard', () => ({ getStringAsync: () => mockClipboard.getString() }));

async function otpApp(): Promise<TestApp> {
  const app = await createTestApp({ loggedIn: false });
  const challenge = await app.auth.requestOtp(phoneOf('usr_001'));
  mockNav.router.replace({
    pathname: '/otp',
    params: { otpId: challenge.otpId, phone: phoneOf('usr_001'), resendAfterSec: '30' },
  });
  return app;
}

const otpField = () => screen.getByTestId('otp-input').props.value as string;

describe('scenario: a code on the clipboard', () => {
  it('fills the field from an SMS-style message but does not sign in by itself', async () => {
    mockClipboard.set(`Your PaisaPe OTP is ${DEMO_OTP}. Valid for 5 minutes.`);
    const app = await otpApp();
    await renderWithApp(<OtpScreen />, { app });
    await waitFor(() => expect(otpField()).toBe(DEMO_OTP));

    await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
    expect(app.userId()).toBeNull();
    expect(mockNav.location().path).toBe('/otp');

    await fireEvent.press(screen.getByTestId('otp-verify'));
    await waitFor(() => expect(app.userId()).toBe('usr_001'));
    await screen.unmount();
    app.dispose();
  });

  it('accepts a clipboard that holds nothing but the code', async () => {
    mockClipboard.set(`  ${DEMO_OTP}\n`);
    const app = await otpApp();
    await renderWithApp(<OtpScreen />, { app });
    await waitFor(() => expect(otpField()).toBe(DEMO_OTP));
    await screen.unmount();
    app.dispose();
  });

  it.each([
    ['several six-digit numbers', 'Order 123456 shipped, refund 654321, ticket 234567'],
    ['an OTP keyword with two codes', 'OTP 123456 or 654321'],
    ['six digits without an OTP keyword', 'Invoice 123456 total due 1000'],
    ['a longer number', 'Card 4111111111111111'],
    ['plain text', 'remember to buy milk'],
  ])('leaves the field empty for %s', async (_name, text) => {
    mockClipboard.set(text);
    const app = await otpApp();
    await renderWithApp(<OtpScreen />, { app });
    await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
    expect(mockClipboard.reads()).toBeGreaterThan(0);
    expect(otpField()).toBe('');
    expect(app.userId()).toBeNull();
    await screen.unmount();
    app.dispose();
  });
});
