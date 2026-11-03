import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createTestApp, renderWithApp, type TestApp } from '@pp/harness';
import { formatPaise } from '@pp/core-money';
import { BILLS_SERVICE, computeBillTotal } from '@pp/svc-bills';
import { BillsScreen } from '../index';
import { dueKey, groupByCategory, isValidAccountRef } from '../state/bill-view';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

let app: TestApp | undefined;

afterEach(() => {
  app?.dispose();
  app = undefined;
});

describe('bill view helpers', () => {
  it('validates account references', () => {
    expect(isValidAccountRef('9800000001')).toBe(true);
    expect(isValidAccountRef('12')).toBe(false);
    expect(isValidAccountRef('bad ref!')).toBe(false);
  });

  it('groups billers by category in display order and skips empty ones', () => {
    const groups = groupByCategory([
      { id: 'b1', name: 'Gas Co', category: 'gas' },
      { id: 'b2', name: 'Power Co', category: 'electricity' },
    ] as never);
    expect(groups.map(([category]) => category)).toEqual(['electricity', 'gas']);
  });
});

describe('BillsScreen', () => {
  it('shows each due with its fee breakdown and the exact total', async () => {
    app = await createTestApp();
    const bills = app.container.resolve(BILLS_SERVICE);
    const due = (await bills.dues())[0];
    expect(due).toBeDefined();
    await renderWithApp(<BillsScreen />, { app });
    const total = await screen.findByTestId(`due-total-${dueKey(due as never)}`);
    const expected = computeBillTotal(due?.items ?? []).total;
    expect(String(total.props.children)).toBe(formatPaise(expected));
    expect(screen.getAllByText('Convenience fee').length).toBeGreaterThan(0);
  });

  it('pays a due after confirmation and debits exactly the shown total', async () => {
    app = await createTestApp();
    const bills = app.container.resolve(BILLS_SERVICE);
    const due = (await bills.dues())[0];
    if (!due) throw new Error('no due');
    const before = app.admin.getBalance('usr_001' as never).balance;
    const spy = jest.spyOn(bills, 'pay');
    await renderWithApp(<BillsScreen />, { app });
    await fireEvent.press(await screen.findByTestId(`pay-${dueKey(due)}`));
    await fireEvent.press(await screen.findByText('Continue'));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const shown = computeBillTotal(due.items).total;
    await waitFor(() =>
      expect(app?.admin.getBalance('usr_001' as never).balance).toBe(before - shown),
    );
  });

  it('reuses the same intent id when a payment is retried after a lost response', async () => {
    app = await createTestApp();
    const bills = app.container.resolve(BILLS_SERVICE);
    const due = (await bills.dues())[0];
    if (!due) throw new Error('no due');
    const before = app.admin.getBalance('usr_001' as never).balance;
    const spy = jest.spyOn(bills, 'pay');
    app.chaos.dropResponse({ endpoint: 'bills.pay' }, 1);
    await renderWithApp(<BillsScreen />, { app });
    await fireEvent.press(await screen.findByTestId(`pay-${dueKey(due)}`));
    await fireEvent.press(await screen.findByText('Continue'));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('Continue')).toBeTruthy());
    await fireEvent.press(screen.getByText('Continue'));
    await waitFor(() => expect(spy.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(spy.mock.calls[1]?.[1]?.intentId).toBe(spy.mock.calls[0]?.[1]?.intentId);
    const shown = computeBillTotal(due.items).total;
    await waitFor(() =>
      expect(app?.admin.getBalance('usr_001' as never).balance).toBe(before - shown),
    );
  });

  it('lists billers by category', async () => {
    app = await createTestApp();
    await renderWithApp(<BillsScreen />, { app });
    await fireEvent.press(await screen.findByTestId('tab-billers'));
    expect(await screen.findByText('Electricity')).toBeTruthy();
  });

  it('keeps Recharge disabled until the form is valid, then recharges once', async () => {
    app = await createTestApp();
    const bills = app.container.resolve(BILLS_SERVICE);
    const spy = jest.spyOn(bills, 'recharge');
    await renderWithApp(<BillsScreen />, { app });
    await fireEvent.press(await screen.findByTestId('tab-recharge'));
    const submit = await screen.findByTestId('recharge-submit');
    expect(submit.props.accessibilityState?.disabled).toBe(true);
    await fireEvent.changeText(screen.getByLabelText('Account number'), '9800000001');
    await fireEvent.changeText(screen.getByTestId('amount-input'), '199');
    await fireEvent.press(screen.getByTestId('recharge-submit'));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy.mock.calls[0]?.[2]).toBe(19900);
  });
});
