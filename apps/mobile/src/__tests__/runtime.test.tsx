import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { installMemoryAppStorage, resetTestEnvironment } from '@pp/harness';
import { lockStore } from '@pp/platform-lifecycle';
import { LEDGER } from '@pp/svc-ledger';
import { AppProviders, createAppRuntime, type AppRuntime } from '../runtime';

let runtime: AppRuntime | undefined;

beforeEach(() => {
  resetTestEnvironment();
  installMemoryAppStorage();
});
afterEach(() => {
  runtime?.dispose();
  runtime = undefined;
});

async function signIn(rt: AppRuntime): Promise<void> {
  const challenge = await rt.auth.requestOtp('+919800000001');
  await rt.auth.verifyOtp(challenge.otpId, '123456');
  await rt.whenIdle();
}

describe('createAppRuntime', () => {
  it('runs against the in-process mock platform and builds user services after sign-in', async () => {
    runtime = createAppRuntime();
    await runtime.start();
    expect(runtime.mockServer).not.toBeNull();
    expect(runtime.getContainer().has(LEDGER)).toBe(false);
    await signIn(runtime);
    expect(runtime.getContainer().has(LEDGER)).toBe(true);
  });

  it('notifies subscribers when the active container changes', async () => {
    runtime = createAppRuntime();
    await runtime.start();
    const listener = jest.fn();
    runtime.subscribeContainer(listener);
    await signIn(runtime);
    expect(listener).toHaveBeenCalled();
  });
});

describe('AppProviders', () => {
  it('shows a splash, then the app once state has been read', async () => {
    runtime = createAppRuntime();
    await render(
      <AppProviders runtime={runtime}>
        <Text testID="content">home</Text>
      </AppProviders>,
    );
    await act(async () => {
      await runtime?.whenIdle();
    });
    expect(await screen.findByTestId('content')).toBeTruthy();
  });

  it('shows the lock screen instead of content while locked', async () => {
    lockStore.setState({ pinSet: true, isLocked: true, hydrated: true });
    runtime = createAppRuntime();
    await render(
      <AppProviders runtime={runtime} lockScreen={<Text testID="lock">locked</Text>}>
        <Text testID="content">home</Text>
      </AppProviders>,
    );
    expect(await screen.findByTestId('lock')).toBeTruthy();
    expect(screen.queryByTestId('content')).toBeNull();
  });
});
