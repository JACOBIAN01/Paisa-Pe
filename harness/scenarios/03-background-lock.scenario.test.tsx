import { Text } from 'react-native';
import { act, screen } from '@testing-library/react-native';
import {
  createAppStateObserver,
  createLockController,
  lockStore,
  type LockController,
} from '@pp/platform-lifecycle';
import {
  AppShell,
  createFakeAppState,
  createNav,
  createTestApp,
  recordEvents,
  renderWithApp,
  type FakeAppState,
  type TestApp,
} from '@pp/harness';

const mockNav = createNav('/');
jest.mock('expo-router', () => ({
  useRouter: () => mockNav.router,
  useLocalSearchParams: () => mockNav.params(),
}));

const TIMEOUT_MS = 60_000;
const shell = <AppShell nav={mockNav} screens={{ '/': <Text testID="content">content</Text> }} />;

let app: TestApp;
let appState: FakeAppState;
let controller: LockController;

beforeEach(async () => {
  app = await createTestApp();
  await app.pin.setPin('usr_001', '2468');
  lockStore.setState({ isLocked: false, pinSet: true, hydrated: true });
  appState = createFakeAppState('active');
  controller = createLockController({
    observer: createAppStateObserver(appState),
    lockStore,
    getTimeoutMs: () => TIMEOUT_MS,
    clock: app.clock,
  });
});

afterEach(() => {
  controller.dispose();
  app.dispose();
});

const move = async (state: Parameters<FakeAppState['set']>[0], afterMs = 0): Promise<void> => {
  await act(async () => {
    app.clock.advance(afterMs);
    appState.set(state);
  });
};

describe('scenario: the app locks after time in the background', () => {
  it('stays open for a short trip to the background and locks after a long one', async () => {
    const events = recordEvents();
    await renderWithApp(shell, { app });
    expect(screen.getByTestId('content')).toBeTruthy();

    await move('background');
    await move('active', TIMEOUT_MS - 1_000);
    expect(screen.getByTestId('content')).toBeTruthy();

    await move('background');
    await move('active', TIMEOUT_MS + 1_000);
    expect(screen.getByTestId('lock-screen')).toBeTruthy();
    expect(screen.queryByTestId('content')).toBeNull();
    expect(events.of('lock.locked')).toEqual([{ reason: 'timeout' }]);
    events.stop();
  });

  it('does not lock for system prompts that only make the app inactive', async () => {
    await renderWithApp(shell, { app });
    // A biometric prompt, a permission dialog and the share sheet all look like this.
    for (let i = 0; i < 3; i += 1) {
      await move('inactive', 2 * TIMEOUT_MS);
      await move('active');
    }
    expect(screen.getByTestId('content')).toBeTruthy();
    expect(lockStore.getState().isLocked).toBe(false);
  });

  it('keeps counting through an inactive moment while the app is in the background', async () => {
    await renderWithApp(shell, { app });
    await move('background');
    await move('inactive', 40_000);
    await move('active', 30_000);
    expect(screen.getByTestId('lock-screen')).toBeTruthy();
  });

  it('measures time on the monotonic clock, not the wall clock', async () => {
    await renderWithApp(shell, { app });

    await move('background');
    app.clock.set(app.clock.now() - 3_600_000);
    await move('active', TIMEOUT_MS + 1_000);
    expect(screen.getByTestId('lock-screen')).toBeTruthy();

    await act(async () => lockStore.getState().unlock('pin'));
    await move('background');
    app.clock.set(app.clock.now() + 3_600_000);
    await move('active', 5_000);
    expect(screen.getByTestId('content')).toBeTruthy();
  });

  it('locks as soon as the app is backgrounded when the timeout is zero', async () => {
    controller.dispose();
    controller = createLockController({
      observer: createAppStateObserver(appState),
      lockStore,
      getTimeoutMs: () => 0,
      clock: app.clock,
    });
    await renderWithApp(shell, { app });
    await move('background');
    expect(screen.getByTestId('lock-screen')).toBeTruthy();
  });
});
