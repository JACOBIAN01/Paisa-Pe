import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { HistoryScreen, TxnDetailScreen } from '@pp/feat-history';
import { SendConfirmScreen, SendScreen } from '@pp/feat-send-money';
import { LIMITS_SERVICE } from '@pp/svc-limits';
import { SYNC_SERVICE } from '@pp/svc-sync';
import { createTestApp, renderWithApp, type TestApp } from '../index';
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
});

afterEach(() => {
  app.dispose();
});

describe('scenario 25: history and repeat payment', () => {
  it('pages through history, then repeats an earlier payment as one new debit', async () => {
    ensureBalance(app, 2_000_000);
    await app.container.resolve(SYNC_SERVICE).syncNow();

    await renderWithApp(<HistoryScreen />, { app });
    expect(await screen.findAllByTestId(/^txn-txn_/)).toHaveLength(25);
    await fireEvent.press(screen.getByTestId('load-more'));
    await waitFor(() => expect(screen.getByTestId('history-screen').props.data).toHaveLength(50));
    await screen.unmount();

    const original = sendsOf(app).find((txn) => txn.counterparty?.phone && txn.amount < 500_000);
    expect(original).toBeDefined();
    const sendsBefore = sendsOf(app).length;
    const before = balanceOf(app);

    mockParams.current = { id: original?.id as string };
    await renderWithApp(<TxnDetailScreen />, { app });
    await fireEvent.press(await screen.findByTestId('repeat-payment'));
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalled());
    const [{ pathname, params }] = mockRouter.push.mock.calls[0] as [
      { pathname: string; params: Record<string, string> },
    ];
    expect(pathname).toBe('/send-confirm');
    await screen.unmount();
    expect(sendsOf(app)).toHaveLength(sendsBefore);

    mockParams.current = params;
    await renderWithApp(<SendConfirmScreen />, { app });
    await fireEvent.press(screen.getByTestId('pay-button'));
    await waitFor(() => expect(screen.getByTestId('send-success')).toBeTruthy());

    const sends = sendsOf(app);
    expect(sends).toHaveLength(sendsBefore + 1);
    expect(sends[0]?.amount).toBe(original?.amount);
    expect(sends[0]?.idempotencyKey).toBeDefined();
    expect(sends[0]?.idempotencyKey).not.toBe(original?.idempotencyKey);
    expect(balanceOf(app)).toBeLessThan(before);
  });
});

describe('daily and per-transaction limits', () => {
  it('stops an over-limit send before the confirm screen', async () => {
    ensureBalance(app, 4_000_000);
    const limits = app.root.resolve(LIMITS_SERVICE);
    await limits.refresh();
    expect(
      limits.checkAmount({ amount: 3_000_000 as never, kind: 'send', balance: 4_000_000 as never }),
    ).toMatchObject({
      ok: false,
      reason: 'kyc_required',
    });

    await renderWithApp(<SendScreen />, { app });
    await fireEvent.changeText(screen.getByTestId('recipient-input'), '9800000002');
    await fireEvent.changeText(screen.getByTestId('amount-input'), '30000');
    await waitFor(() =>
      expect(screen.getByTestId('review-button').props.accessibilityState?.disabled).toBe(true),
    );
    await fireEvent.press(screen.getByTestId('review-button'));
    expect(mockRouter.push).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it('shows why a payment was refused when the amount reaches the server anyway', async () => {
    ensureBalance(app, 4_000_000);
    const before = balanceOf(app);
    const sendsBefore = sendsOf(app).length;
    mockParams.current = { to: '+919800000002', amount: '30000.00' };
    await renderWithApp(<SendConfirmScreen />, { app });
    await fireEvent.press(screen.getByTestId('pay-button'));
    expect(await screen.findByText(/limit|verif|kyc|upgrade/i)).toBeTruthy();
    expect(screen.queryByTestId('send-success')).toBeNull();
    expect(balanceOf(app)).toBe(before);
    expect(sendsOf(app)).toHaveLength(sendsBefore);
  });

  it('lets a send within the limits through', async () => {
    ensureBalance(app, 4_000_000);
    const limits = app.root.resolve(LIMITS_SERVICE);
    await limits.refresh();
    expect(
      limits.checkAmount({ amount: 1_000_000 as never, kind: 'send', balance: 4_000_000 as never }),
    ).toEqual({
      ok: true,
    });
  });
});
