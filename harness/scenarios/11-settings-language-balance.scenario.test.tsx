import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { getLanguage, t } from '@pp/core-i18n';
import { MASKED_BALANCE } from '@pp/design-system';
import { HomeScreen, useBalanceVisibility } from '@pp/feat-home';
import { SettingsScreen } from '@pp/feat-settings';
import { PROFILE_SERVICE } from '@pp/svc-profile';
import { createTestApp, renderWithApp } from '@pp/harness';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

describe('scenario: preferences changed in settings show up on home', () => {
  afterEach(() => useBalanceVisibility.getState().reset());

  it('switches to Hindi and hides the balance, and home follows', async () => {
    const app = await createTestApp();
    const settings = await renderWithApp(<SettingsScreen />, { app });

    await screen.findByTestId('language-picker');
    await fireEvent.press(screen.getByTestId('language-hi'));
    await waitFor(() => expect(getLanguage()).toBe('hi'));
    await fireEvent(await screen.findByTestId('toggle-hide-balance'), 'valueChange', true);

    const profile = app.container.resolve(PROFILE_SERVICE);
    await waitFor(async () => {
      const saved = await profile.getPreferences();
      expect(saved).toMatchObject({ language: 'hi', hideBalance: true });
    });
    await settings.unmount();

    const saved = await profile.getPreferences();
    const home = await renderWithApp(<HomeScreen />, { app, lang: saved.language });
    expect(t('home.balance')).not.toBe('Balance');
    expect(screen.getByText(t('home.balance'))).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByTestId('home-balance').props.children).toBe(MASKED_BALANCE),
    );

    await fireEvent.press(screen.getByTestId('toggle-balance'));
    expect(screen.getByTestId('home-balance').props.children).not.toBe(MASKED_BALANCE);
    await fireEvent.press(screen.getByTestId('toggle-balance'));
    expect(screen.getByTestId('home-balance').props.children).toBe(MASKED_BALANCE);

    await home.unmount();
    app.dispose();
  });

  it('turning the setting off shows the balance again', async () => {
    const app = await createTestApp();
    await app.container.resolve(PROFILE_SERVICE).updatePreferences({ hideBalance: true });
    const settings = await renderWithApp(<SettingsScreen />, { app });
    await fireEvent(await screen.findByTestId('toggle-hide-balance'), 'valueChange', false);
    await waitFor(async () => {
      const saved = await app.container.resolve(PROFILE_SERVICE).getPreferences();
      expect(saved.hideBalance).toBe(false);
    });
    await settings.unmount();

    await renderWithApp(<HomeScreen />, { app });
    await waitFor(() =>
      expect(screen.getByTestId('home-balance').props.children).not.toBe(MASKED_BALANCE),
    );
    await screen.unmount();
    app.dispose();
  });
});
