import { Text } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { waitForHydration } from '@pp/core-store';
import { createLockStore, lockStore } from '@pp/platform-lifecycle';
import { AppShell, createNav, createTestApp, recordEvents, renderWithApp } from '@pp/harness';

const mockNav = createNav('/');
jest.mock('expo-router', () => ({
  useRouter: () => mockNav.router,
  useLocalSearchParams: () => mockNav.params(),
}));

const PIN = '2468';
const enterPin = async (pin: string): Promise<void> => {
  for (const digit of pin) await fireEvent.press(screen.getByTestId(`pin-key-${digit}`));
};

const shell = <AppShell nav={mockNav} screens={{ '/': <Text testID="content">content</Text> }} />;

async function coldStartApp() {
  const app = await createTestApp();
  await app.pin.setPin('usr_001', PIN);
  await act(async () => {
    lockStore.setState({ isLocked: true, pinSet: true, hydrated: true });
  });
  return app;
}

describe('scenario: cold start with a PIN set', () => {
  it('a restarted process finds the lock persisted and starts locked', async () => {
    const app = await createTestApp();
    const first = createLockStore({ storage: app.storage.backend, bus: { emit: jest.fn() } });
    await waitForHydration(first);
    first.getState().setPinSet(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const emit = jest.fn();
    const second = createLockStore({ storage: app.storage.backend, bus: { emit } });
    expect(second.getState().isLocked).toBe(true);
    await waitForHydration(second);
    expect(second.getState().pinSet).toBe(true);
    expect(second.getState().isLocked).toBe(true);
    expect(emit).toHaveBeenCalledWith('lock.locked', { reason: 'cold_start' });
    app.dispose();
  });

  it('shows the lock gate, never the content, until the PIN is right', async () => {
    const app = await coldStartApp();
    const events = recordEvents();
    await renderWithApp(shell, { app });
    expect(screen.getByTestId('lock-screen')).toBeTruthy();
    expect(screen.queryByTestId('content')).toBeNull();

    await enterPin('1111');
    await waitFor(() => expect(screen.getByText(/Wrong PIN. 4 attempts left/)).toBeTruthy());
    expect(screen.queryByTestId('content')).toBeNull();

    await enterPin(PIN);
    await waitFor(() => expect(screen.getByTestId('content')).toBeTruthy());
    expect(lockStore.getState().isLocked).toBe(false);
    expect(events.of('lock.unlocked')).toEqual([{ method: 'pin' }]);
    events.stop();
    await screen.unmount();
    app.dispose();
  });

  it('locks the PIN pad after five wrong tries and frees it once the lockout has passed', async () => {
    const app = await coldStartApp();
    const first = await renderWithApp(shell, { app });

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await enterPin('1111');
      await waitFor(() =>
        expect(
          screen.getByText(new RegExp(`Wrong PIN. ${5 - attempt} attempts left`)),
        ).toBeTruthy(),
      );
    }
    await enterPin('1111');
    await waitFor(() => expect(screen.getByTestId('lockout-notice')).toBeTruthy());
    expect(screen.queryByTestId('pin-key-1')).toBeNull();

    // Relaunching straight away does not reset the counter, and neither does the right PIN.
    await first.unmount();
    const relaunched = await renderWithApp(shell, { app });
    expect(screen.getByTestId('lockout-notice')).toBeTruthy();
    expect(lockStore.getState().isLocked).toBe(true);
    await relaunched.unmount();

    // Time passes on the monotonic clock; a wall-clock change alone would not matter.
    app.clock.advance(31_000);
    await renderWithApp(shell, { app });
    await waitFor(() => expect(screen.getByTestId('pin-key-1')).toBeTruthy());
    await enterPin(PIN);
    await waitFor(() => expect(screen.getByTestId('content')).toBeTruthy());
    await screen.unmount();
    app.dispose();
  });
});
