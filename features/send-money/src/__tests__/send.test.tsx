import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithApp, type TestApp } from '@pp/harness';
import { chaosControls } from '@pp/harness';
import { TRANSFER_SERVICE } from '@pp/svc-transfers';
import { Text } from 'react-native';
import { usePayment } from '../hooks/usePayment';
import { SendConfirmScreen } from '../screens/SendConfirmScreen';
import { SendScreen } from '../screens/SendScreen';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
const mockParams: { current: Record<string, string | string[]> } = { current: {} };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams.current,
}));

const PHONE = '+919800000002';
let app: TestApp | undefined;

const sends = (a: TestApp) => a.admin.listTxns('usr_001').filter((x) => x.type === 'p2p_send');

beforeEach(() => {
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.back.mockClear();
  mockParams.current = { to: PHONE, amount: '250.00', note: 'Lunch' };
});

afterEach(async () => {
  await app?.dispose();
  app = undefined;
});

describe('SendConfirmScreen', () => {
  it('shows exactly what will be paid', async () => {
    ({ app } = await renderWithApp(<SendConfirmScreen />));
    expect(screen.getByTestId('confirm-amount').props.children).toBe('₹250.00');
    expect(screen.getByTestId('confirm-note').props.children).toBe('Lunch');
    expect(screen.getByTestId('pay-button')).toBeTruthy();
  });

  it('rejects a link with a repeated amount and offers no pay button', async () => {
    mockParams.current = { to: PHONE, amount: ['10.00', '9000.00'] };
    ({ app } = await renderWithApp(<SendConfirmScreen />));
    expect(screen.getByTestId('send-confirm-invalid')).toBeTruthy();
    expect(screen.queryByTestId('pay-button')).toBeNull();
  });

  it('pays once and shows the receipt', async () => {
    ({ app } = await renderWithApp(<SendConfirmScreen />));
    const before = sends(app).length;
    const balanceBefore = app.admin.getBalance('usr_001').balance;
    await fireEvent.press(screen.getByTestId('pay-button'));
    await waitFor(() => expect(screen.getByTestId('send-success')).toBeTruthy());
    expect(sends(app).length).toBe(before + 1);
    expect(app.admin.getBalance('usr_001').balance).toBe(balanceBefore - 25000);
    expect(screen.getByTestId('receipt-summary')).toBeTruthy();
  });

  it('shows a failure with an actionable retry when the server refuses', async () => {
    mockParams.current = { to: PHONE, amount: '99999999.00' };
    ({ app } = await renderWithApp(<SendConfirmScreen />));
    const before = sends(app).length;
    await fireEvent.press(screen.getByTestId('pay-button'));
    await waitFor(() => expect(screen.getByText(/limit|balance|failed/i)).toBeTruthy());
    expect(screen.queryByTestId('send-success')).toBeNull();
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(sends(app).length).toBe(before);
  });

  it('keeps a single debit when the user leaves while the response is in flight', async () => {
    ({ app } = await renderWithApp(<SendConfirmScreen />));
    const controls = chaosControls(app.chaos);
    const before = sends(app).length;
    controls.slowResponses(5_000);
    await fireEvent.press(screen.getByTestId('pay-button'));
    await act(async () => {
      await app?.clock.tick(100);
    });
    await screen.unmount();
    controls.fastNetwork();
    await act(async () => {
      await app?.clock.tick(10_000);
      await app?.container.resolve(TRANSFER_SERVICE).flushQueue();
    });
    expect(sends(app).length).toBe(before + 1);
  });
});

function TripleTap() {
  const payment = usePayment({ to: PHONE as never, amount: 12000 as never });
  return (
    <Text
      testID="triple"
      onPress={() => {
        payment.pay();
        payment.pay();
        payment.pay();
      }}
    >
      {payment.state.phase}
    </Text>
  );
}

describe('usePayment', () => {
  it('sends one request when pay is invoked three times before a re-render', async () => {
    ({ app } = await renderWithApp(<TripleTap />));
    const before = sends(app).length;
    await fireEvent.press(screen.getByTestId('triple'));
    await waitFor(() => expect(screen.getByTestId('triple').props.children).toBe('sent'));
    expect(sends(app).length).toBe(before + 1);
  });
});

describe('SendScreen', () => {
  it('goes to the confirm screen with the typed details', async () => {
    ({ app } = await renderWithApp(<SendScreen />));
    await fireEvent.changeText(screen.getByTestId('recipient-input'), '9800000002');
    await fireEvent.changeText(screen.getByTestId('amount-input'), '125.5');
    await waitFor(() =>
      expect(screen.getByTestId('review-button').props.accessibilityState?.disabled).toBeFalsy(),
    );
    await fireEvent.press(screen.getByTestId('review-button'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/send-confirm',
      params: { to: PHONE, amount: '125.50' },
    });
  });

  it('blocks review when the amount is above the wallet balance', async () => {
    const result = await renderWithApp(<SendScreen />);
    app = result.app;
    await fireEvent.changeText(screen.getByTestId('recipient-input'), '9800000002');
    await fireEvent.changeText(screen.getByTestId('amount-input'), '99999999');
    await waitFor(() =>
      expect(screen.getByText(/more than your wallet balance|not enough|limit/i)).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId('review-button'));
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
