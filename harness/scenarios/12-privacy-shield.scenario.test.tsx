import { View } from 'react-native';
import { act, screen } from '@testing-library/react-native';
import { HomeScreen } from '@pp/feat-home';
import { createAppStateObserver, usePrivacyShield } from '@pp/platform-lifecycle';
import { createFakeAppState, createTestApp, renderWithApp } from '@pp/harness';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

/** What the app root does: draw an opaque cover over everything while the app is not active. */
function Shielded({ observer }: { observer: ReturnType<typeof createAppStateObserver> }) {
  const covered = usePrivacyShield(observer);
  return (
    <>
      <HomeScreen />
      {covered ? <View testID="privacy-cover" /> : null}
    </>
  );
}

const move = (
  fake: ReturnType<typeof createFakeAppState>,
  state: 'active' | 'inactive' | 'background',
) => act(async () => fake.set(state));

describe('scenario: the balance is hidden whenever the app is not in the foreground', () => {
  it('covers on iOS-style transitions: inactive, then background', async () => {
    const app = await createTestApp();
    const fake = createFakeAppState();
    await renderWithApp(<Shielded observer={createAppStateObserver(fake)} />, { app });
    expect(screen.queryByTestId('privacy-cover')).toBeNull();

    await move(fake, 'inactive');
    expect(screen.getByTestId('privacy-cover')).toBeTruthy();
    await move(fake, 'background');
    expect(screen.getByTestId('privacy-cover')).toBeTruthy();
    await move(fake, 'active');
    expect(screen.queryByTestId('privacy-cover')).toBeNull();
    await screen.unmount();
    app.dispose();
  });

  it('covers when the app only ever becomes inactive, as in the Android app switcher', async () => {
    const app = await createTestApp();
    const fake = createFakeAppState();
    await renderWithApp(<Shielded observer={createAppStateObserver(fake)} />, { app });

    await move(fake, 'inactive');
    expect(screen.getByTestId('privacy-cover')).toBeTruthy();
    await move(fake, 'active');
    expect(screen.queryByTestId('privacy-cover')).toBeNull();
    await screen.unmount();
    app.dispose();
  });

  it('covers a direct jump to the background and stops listening on unmount', async () => {
    const app = await createTestApp();
    const fake = createFakeAppState();
    const view = await renderWithApp(<Shielded observer={createAppStateObserver(fake)} />, { app });
    expect(fake.listenerCount()).toBe(1);

    await move(fake, 'background');
    expect(screen.getByTestId('privacy-cover')).toBeTruthy();
    await view.unmount();
    expect(fake.listenerCount()).toBe(0);
    app.dispose();
  });

  it('starts covered when the app launches in the background', async () => {
    const app = await createTestApp();
    const fake = createFakeAppState('background');
    await renderWithApp(<Shielded observer={createAppStateObserver(fake)} />, { app });
    expect(screen.getByTestId('privacy-cover')).toBeTruthy();
    await screen.unmount();
    app.dispose();
  });
});
