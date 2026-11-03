import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { SendConfirmScreen, SendScreen } from '@pp/feat-send-money';
import { HistoryScreen } from '@pp/feat-history';
import { SYNC_SERVICE } from '@pp/svc-sync';
import { LEDGER } from '@pp/svc-ledger';
import { createTestApp, phoneOf, renderWithApp, type TestApp } from '../index';
import { balanceOf, ensureBalance, sendsOf } from './money-support';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
const mockParams: { current: Record<string, string | string[]> } = { current: {} };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams.current,
}));

let app: TestApp;

beforeEach(async () => {
  mockRouter.push.mockClear();
  mockParams.current = {};
  app = await createTestApp();
  ensureBalance(app, 500_000);
});

afterEach(() => {
  app.dispose();
});

describe('scenario 13: send money end to end', () => {
  it('goes from the send screen to a receipt, debits exactly the amount and shows in history', async () => {
    const meBefore = balanceOf(app);
    const friendBefore = balanceOf(app, 'usr_002');
    const sendsBefore = sendsOf(app).length;

    await renderWithApp(<SendScreen />, { app });
    await fireEvent.changeText(screen.getByTestId('recipient-input'), '9800000002');
    await fireEvent.changeText(screen.getByTestId('amount-input'), '250');
    await waitFor(() =>
      expect(screen.getByTestId('review-button').props.accessibilityState?.disabled).toBeFalsy(),
    );
    await fireEvent.press(screen.getByTestId('review-button'));
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    const [{ pathname, params }] = mockRouter.push.mock.calls[0] as [
      { pathname: string; params: Record<string, string> },
    ];
    expect(pathname).toBe('/send-confirm');
    expect(params).toMatchObject({ to: phoneOf('usr_002'), amount: '250.00' });
    await screen.unmount();

    mockParams.current = params;
    await renderWithApp(<SendConfirmScreen />, { app });
    expect(screen.getByTestId('confirm-amount').props.children).toBe('₹250.00');
    await fireEvent.press(screen.getByTestId('pay-button'));
    await waitFor(() => expect(screen.getByTestId('send-success')).toBeTruthy());
    await screen.unmount();

    expect(balanceOf(app)).toBe(meBefore - 25_000);
    expect(balanceOf(app, 'usr_002')).toBe(friendBefore + 25_000);
    const sends = sendsOf(app);
    expect(sends).toHaveLength(sendsBefore + 1);
    const latest = sends[0];
    expect(latest?.amount).toBe(25_000);

    await act(async () => {
      await app.container.resolve(SYNC_SERVICE).syncNow();
    });
    await renderWithApp(<HistoryScreen />, { app });
    expect(await screen.findByTestId(`txn-${latest?.id}`)).toBeTruthy();
  });

  it('keeps the local ledger projection in agreement with the server after paying', async () => {
    const ledger = app.container.resolve(LEDGER);
    await ledger.fetchBalance();
    mockParams.current = { to: phoneOf('usr_003'), amount: '99.99' };
    await renderWithApp(<SendConfirmScreen />, { app });
    await fireEvent.press(screen.getByTestId('pay-button'));
    await waitFor(() => expect(screen.getByTestId('send-success')).toBeTruthy());
    await ledger.fetchBalance();
    expect(ledger.projectedBalance()).toBe(balanceOf(app));
  });
});
