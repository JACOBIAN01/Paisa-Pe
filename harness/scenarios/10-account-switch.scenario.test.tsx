import { screen, waitFor } from '@testing-library/react-native';
import { formatPaise, paise } from '@pp/core-money';
import { HistoryScreen } from '@pp/feat-history';
import { HomeScreen } from '@pp/feat-home';
import { LIMITS_SERVICE } from '@pp/svc-limits';
import { LEDGER } from '@pp/svc-ledger';
import { AccountScope, createTestApp, renderWithApp, type TestApp } from '@pp/harness';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const idsOf = (app: TestApp, userId: string): Set<string> =>
  new Set(app.admin.listTxns(userId).map((txn) => String(txn.id)));

const visibleTxnIds = (): string[] =>
  screen.queryAllByTestId(/^txn-txn_/).map((node) => String(node.props.testID).slice(4));

describe('scenario: switching between two accounts on one device', () => {
  it('shows the second account’s history and limits, never the first’s', async () => {
    const app = await createTestApp({ user: 'usr_001' });
    const first = idsOf(app, 'usr_001');
    const second = idsOf(app, 'usr_002');
    expect(first.size).toBeGreaterThan(second.size);

    const view = await renderWithApp(
      <AccountScope container={app.container}>
        <HistoryScreen />
      </AccountScope>,
      { app },
    );
    await waitFor(() => expect(visibleTxnIds().length).toBeGreaterThan(0));
    expect(visibleTxnIds().every((id) => first.has(id))).toBe(true);

    const limits = app.root.resolve(LIMITS_SERVICE);
    expect((await limits.refresh()).tier).toBe('basic');

    await app.login('usr_002');
    expect(app.userId()).toBe('usr_002');
    await view.rerender(
      <AccountScope container={app.container}>
        <HistoryScreen />
      </AccountScope>,
    );

    await waitFor(() => {
      const ids = visibleTxnIds();
      expect(ids.length).toBe(second.size);
      expect(ids.every((id) => second.has(id))).toBe(true);
    });
    expect(visibleTxnIds().some((id) => first.has(id))).toBe(false);

    const snapshot = await limits.getSnapshot();
    expect(snapshot === null || snapshot.tier === 'full').toBe(true);
    expect((await limits.refresh()).tier).toBe('full');

    await app.switchAccount('usr_001');
    await view.rerender(
      <AccountScope container={app.container}>
        <HistoryScreen />
      </AccountScope>,
    );
    await waitFor(() => expect(visibleTxnIds().length).toBeGreaterThan(second.size));
    expect(visibleTxnIds().every((id) => first.has(id))).toBe(true);
    expect((await limits.refresh()).tier).toBe('basic');

    await screen.unmount();
    app.dispose();
  });

  it('shows the active account’s balance on home after every switch', async () => {
    const app = await createTestApp({ user: 'usr_001' });
    const balanceOf = (userId: string) => formatPaise(paise(app.admin.getBalance(userId).balance));
    expect(balanceOf('usr_001')).not.toBe(balanceOf('usr_002'));

    const view = await renderWithApp(
      <AccountScope container={app.container}>
        <HomeScreen />
      </AccountScope>,
      { app },
    );
    await waitFor(() =>
      expect(screen.getByTestId('home-balance').props.children).toBe(balanceOf('usr_001')),
    );
    expect(screen.getByText('Hello, Aarav Sharma')).toBeTruthy();

    await app.login('usr_002');
    await view.rerender(
      <AccountScope container={app.container}>
        <HomeScreen />
      </AccountScope>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('home-balance').props.children).toBe(balanceOf('usr_002')),
    );
    expect(screen.queryByText('Hello, Aarav Sharma')).toBeNull();

    await app.switchAccount('usr_001');
    await view.rerender(
      <AccountScope container={app.container}>
        <HomeScreen />
      </AccountScope>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('home-balance').props.children).toBe(balanceOf('usr_001')),
    );

    const ledger = app.container.resolve(LEDGER);
    await ledger.fetchBalance();
    expect(ledger.projectedBalance()).toBe(app.admin.getBalance('usr_001').balance);
    await screen.unmount();
    app.dispose();
  });
});
