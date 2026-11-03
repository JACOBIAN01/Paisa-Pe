import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createTestApp, renderWithApp } from '@pp/harness';
import { formatPaise, paise } from '@pp/core-money';
import { HomeScreen } from '../index';
import { isBalanceMasked, useBalanceVisibility } from '../state/balance-visibility';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));

describe('HomeScreen', () => {
  afterEach(() => {
    mockPush.mockClear();
    useBalanceVisibility.getState().reset();
  });

  it('shows the greeting and the wallet balance from the server', async () => {
    const app = await createTestApp();
    await renderWithApp(<HomeScreen />, { app });
    const expected = formatPaise(paise(app.admin.getBalance('usr_001').balance));
    await waitFor(() => expect(screen.getByText('Hello, Aarav Sharma')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('home-balance').props.children).toBe(expected));
    app.dispose();
  });

  it('masks and reveals the balance', async () => {
    const app = await createTestApp();
    await renderWithApp(<HomeScreen />, { app });
    await waitFor(() => expect(screen.getByTestId('home-balance')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('toggle-balance'));
    expect(screen.getByTestId('home-balance').props.children).toBe('₹ ••••••');
    await fireEvent.press(screen.getByTestId('toggle-balance'));
    expect(screen.getByTestId('home-balance').props.children).not.toBe('₹ ••••••');
    app.dispose();
  });

  it('lists recent activity and opens a transaction', async () => {
    const app = await createTestApp();
    await renderWithApp(<HomeScreen />, { app });
    const rows = await screen.findAllByTestId(/^recent-/);
    expect(rows.length).toBeLessThanOrEqual(5);
    await fireEvent.press(rows[0] as (typeof rows)[number]);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/txn-detail',
      params: { id: expect.stringMatching(/^txn_/) },
    });
    app.dispose();
  });

  it('navigates from quick actions', async () => {
    const app = await createTestApp();
    await renderWithApp(<HomeScreen />, { app });
    await fireEvent.press(screen.getByTestId('action-split'));
    expect(mockPush).toHaveBeenCalledWith('/split');
    app.dispose();
  });
});

describe('isBalanceMasked', () => {
  it('prefers the session override over the saved preference', () => {
    expect(isBalanceMasked(true, null)).toBe(true);
    expect(isBalanceMasked(true, true)).toBe(false);
    expect(isBalanceMasked(false, false)).toBe(true);
  });
});
