import { Text } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { SendConfirmScreen } from '@pp/feat-send-money';
import { createDeepLinkRouter } from '@pp/platform-deeplink';
import { lockStore } from '@pp/platform-lifecycle';
import {
  AppShell,
  createFakeLinking,
  createNav,
  createTestApp,
  recordEvents,
  renderWithApp,
  type TestApp,
} from '@pp/harness';

const mockNav = createNav('/');
jest.mock('expo-router', () => ({
  useRouter: () => mockNav.router,
  useLocalSearchParams: () => mockNav.params(),
}));

const PIN = '2468';
const PAYEE = '+919800000002';
const link = (query: string) => `paisape://pay?${query}`;
const PAY_LINK = link(`to=${encodeURIComponent(PAYEE)}&amount=250.00&note=Lunch`);

const shell = (
  <AppShell
    nav={mockNav}
    screens={{
      '/': <Text testID="landing">landing</Text>,
      '/send-confirm': <SendConfirmScreen />,
    }}
  />
);

const routerFor = (initialUrl: string) => {
  const linking = createFakeLinking(initialUrl);
  const router = createDeepLinkRouter({
    linking,
    navigate: (route, params) => mockNav.router.push({ pathname: `/${route}`, params }),
    isReady: () => lockStore.getState().hydrated,
    isLocked: () => lockStore.getState().isLocked,
    subscribeUnlock: (onChange) => lockStore.subscribe(onChange),
  });
  return { router, linking };
};

async function lockedApp(): Promise<TestApp> {
  const app = await createTestApp();
  await app.pin.setPin('usr_001', PIN);
  await act(async () => {
    lockStore.setState({ isLocked: true, pinSet: true, hydrated: true });
  });
  mockNav.router.replace('/');
  return app;
}

const sends = (app: TestApp) => app.admin.listTxns('usr_001').filter((t) => t.type === 'p2p_send');

describe('scenario: a payment link opens the app from a cold start', () => {
  it('waits behind the lock, then shows the same amount it pays', async () => {
    const app = await lockedApp();
    const events = recordEvents();
    const { router } = routerFor(PAY_LINK);
    await router.start();

    expect(router.pending()).toBe(1);
    expect(mockNav.location().path).toBe('/');
    expect(events.of('deeplink.received')).toEqual([{ url: PAY_LINK, source: 'cold' }]);

    await renderWithApp(shell, { app });
    expect(screen.getByTestId('lock-screen')).toBeTruthy();
    for (const digit of PIN) await fireEvent.press(screen.getByTestId(`pin-key-${digit}`));

    await waitFor(() => expect(mockNav.location().path).toBe('/send-confirm'));
    expect(router.pending()).toBe(0);
    expect(mockNav.location().params).toEqual({ to: PAYEE, amount: '250.00', note: 'Lunch' });
    expect(screen.getByTestId('confirm-amount').props.children).toBe('₹250.00');

    const before = sends(app).length;
    const balanceBefore = app.admin.getBalance('usr_001').balance;
    await fireEvent.press(screen.getByTestId('pay-button'));
    await waitFor(() => expect(screen.getByTestId('send-success')).toBeTruthy());

    const created = sends(app).slice(before);
    expect(created).toHaveLength(1);
    expect(created[0]?.amount).toBe(25_000);
    expect(app.admin.getBalance('usr_001').balance).toBe(balanceBefore - 25_000);

    router.dispose();
    events.stop();
    await screen.unmount();
    app.dispose();
  });

  it('goes straight to the confirm screen when the app is already unlocked', async () => {
    const app = await createTestApp();
    const { router } = routerFor(PAY_LINK);
    await router.start();
    await renderWithApp(shell, { app });
    expect(mockNav.location().path).toBe('/send-confirm');
    expect(screen.getByTestId('confirm-amount').props.children).toBe('₹250.00');
    router.dispose();
    await screen.unmount();
    app.dispose();
  });

  it('refuses a link that repeats the amount', async () => {
    const app = await lockedApp();
    const events = recordEvents();
    const { router } = routerFor(link(`to=${encodeURIComponent(PAYEE)}&amount=10&amount=9000`));
    await router.start();

    expect(router.pending()).toBe(0);
    expect(events.count('deeplink.received')).toBe(0);
    await act(async () => lockStore.getState().unlock('pin'));
    expect(mockNav.location().path).toBe('/');
    router.dispose();
    events.stop();
    app.dispose();
  });
});
