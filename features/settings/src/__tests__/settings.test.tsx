import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { getLanguage } from '@pp/core-i18n';
import { renderWithApp } from '@pp/harness';
import { PROFILE_SERVICE } from '@pp/svc-profile';
import { SettingsScreen } from '../index';
import { applyPreferencePatch, kycTierLabel } from '../state/settings-model';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
});

describe('SettingsScreen', () => {
  it('shows the profile and the version label', async () => {
    const { app } = await renderWithApp(<SettingsScreen />);
    expect(await screen.findByTestId('settings-profile')).toBeTruthy();
    expect(screen.getByText('Aarav Sharma')).toBeTruthy();
    expect(screen.getByTestId('app-version').props.children).toMatch(/Version/);
    app.dispose();
  });

  it('switches language and persists it through the profile service', async () => {
    const { app } = await renderWithApp(<SettingsScreen />);
    await screen.findByTestId('language-picker');
    await fireEvent.press(screen.getByTestId('language-hi'));
    await waitFor(() => expect(getLanguage()).toBe('hi'));
    const saved = await app.container.resolve(PROFILE_SERVICE).getPreferences();
    expect(saved.language).toBe('hi');
    app.dispose();
  });

  it('toggles hide balance and keeps it after a reload', async () => {
    const { app } = await renderWithApp(<SettingsScreen />);
    const toggle = await screen.findByTestId('toggle-hide-balance');
    await fireEvent(toggle, 'valueChange', true);
    await waitFor(async () => {
      const prefs = await app.container.resolve(PROFILE_SERVICE).getPreferences();
      expect(prefs.hideBalance).toBe(true);
    });
    app.dispose();
  });

  it('rolls the toggle back and shows an error when saving fails', async () => {
    const { app } = await renderWithApp(<SettingsScreen />);
    const toggle = await screen.findByTestId('toggle-notifications');
    const before = toggle.props.value as boolean;
    app.chaos.failNext({ endpoint: 'profile.setPreferences' }, 1);
    await fireEvent(toggle, 'valueChange', !before);
    expect(
      await screen.findByText('We could not save that change. Please try again.'),
    ).toBeTruthy();
    expect(screen.getByTestId('toggle-notifications').props.value).toBe(before);
    app.dispose();
  });

  it('navigates to the linked screens', async () => {
    const { app } = await renderWithApp(<SettingsScreen />);
    await fireEvent.press(await screen.findByTestId('settings-link-security'));
    await fireEvent.press(screen.getByTestId('settings-link-help'));
    expect(mockPush).toHaveBeenNthCalledWith(1, '/security');
    expect(mockPush).toHaveBeenNthCalledWith(2, '/help');
    app.dispose();
  });

  it('logs out after confirmation', async () => {
    const { app } = await renderWithApp(<SettingsScreen />);
    await fireEvent.press(await screen.findByTestId('logout-button'));
    const labels = await screen.findAllByText('Log out');
    await fireEvent.press(labels[labels.length - 1] as (typeof labels)[number]);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    await act(async () => {});
    app.dispose();
  });
});

describe('settings model', () => {
  it('labels tiers and merges patches', () => {
    expect(kycTierLabel('full')).toBe('Full');
    const merged = applyPreferencePatch(
      {
        language: 'en',
        lockTimeoutSec: 30,
        biometricsEnabled: true,
        hideBalance: false,
        pushEnabled: true,
      },
      { hideBalance: true },
    );
    expect(merged.hideBalance).toBe(true);
    expect(merged.lockTimeoutSec).toBe(30);
  });
});
