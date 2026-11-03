import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithApp, type TestApp } from '@pp/harness';
import { QrScanScreen } from '../screens/QrScanScreen';
import { buildMyQrPayload, parseQrPayload } from '../state/payload';
import { getLastScanned, resetQrState } from '../state/qrState';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
}));

let app: TestApp | undefined;

beforeEach(() => {
  resetQrState();
  mockRouter.push.mockClear();
});

afterEach(async () => {
  await app?.dispose();
  app = undefined;
});

describe('parseQrPayload', () => {
  it('accepts a payment link with an amount', () => {
    expect(parseQrPayload('paisape://pay?to=%2B919800000002&amount=250.00&note=Tea')).toEqual({
      route: 'send-confirm',
      params: { to: '+919800000002', amount: '250.00', note: 'Tea' },
    });
  });

  it('accepts a payee-only link', () => {
    expect(parseQrPayload('paisape://send?to=%2B919800000002')).toEqual({
      route: 'send',
      params: { to: '+919800000002' },
    });
  });

  it.each([
    ['repeated amount', 'paisape://pay?to=%2B919800000002&amount=1&amount=9000'],
    ['missing amount', 'paisape://pay?to=%2B919800000002'],
    ['other route', 'paisape://settings'],
    ['other scheme', 'javascript:alert(1)'],
    ['foreign host', 'https://evil.example/pay?to=%2B919800000002&amount=1'],
    ['plain text', 'hello'],
  ])('rejects %s', (_label, text) => {
    expect(parseQrPayload(text)).toBeNull();
  });

  it('round-trips the payload shown under My QR', () => {
    expect(parseQrPayload(buildMyQrPayload('+919800000002'))?.params.to).toBe('+919800000002');
  });
});

describe('QrScanScreen', () => {
  it('routes a valid code to the confirm screen', async () => {
    ({ app } = await renderWithApp(<QrScanScreen />));
    await fireEvent.changeText(
      screen.getByTestId('qr-code-input'),
      'paisape://pay?to=%2B919800000002&amount=99.50',
    );
    await fireEvent.press(screen.getByTestId('qr-continue'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/send-confirm',
      params: { to: '+919800000002', amount: '99.50' },
    });
    expect(getLastScanned()).toContain('paisape://pay');
  });

  it('explains an invalid code and does not navigate', async () => {
    ({ app } = await renderWithApp(<QrScanScreen />));
    await fireEvent.changeText(screen.getByTestId('qr-code-input'), 'not a code');
    await fireEvent.press(screen.getByTestId('qr-continue'));
    expect(screen.getByText(/not a valid PaisaPe payment code/)).toBeTruthy();
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(getLastScanned()).toBeNull();
  });

  it('shows the signed-in user payment code under My QR', async () => {
    ({ app } = await renderWithApp(<QrScanScreen />));
    await fireEvent.press(screen.getByTestId('qr-tab-mine'));
    await waitFor(() => expect(screen.getByTestId('my-qr-payload')).toBeTruthy());
    expect(screen.getByTestId('my-qr-payload').props.children).toBe(
      'paisape://send?to=%2B919800000001',
    );
  });
});
