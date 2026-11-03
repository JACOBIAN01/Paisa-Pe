import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createTestApp, renderWithApp } from '@pp/harness';
import { PROFILE_SERVICE } from '@pp/svc-profile';
import { SecurityScreen } from '../index';

jest.mock('@pp/platform-biometrics', () => ({
  isBiometricAvailable: async () => true,
  authenticateBiometric: async () => 'success',
}));

describe('SecurityScreen', () => {
  it('lists devices and signs out another one after confirmation', async () => {
    const app = await createTestApp();
    app.admin.loginAs('usr_001', { name: 'Old tablet', platform: 'android' });
    await renderWithApp(<SecurityScreen />, { app });

    await waitFor(() => expect(screen.getByText('This device')).toBeTruthy());
    expect(screen.getByText('Old tablet')).toBeTruthy();

    await fireEvent.press(screen.getByText('Sign out device'));
    await fireEvent.press(screen.getByLabelText('Confirm'));
    await waitFor(() => expect(screen.queryByText('Old tablet')).toBeNull());
    app.dispose();
  });

  it('saves the chosen auto-lock timeout', async () => {
    const app = await createTestApp();
    await renderWithApp(<SecurityScreen />, { app });
    await waitFor(() => expect(screen.getByTestId('timeout-300')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('timeout-60'));

    await waitFor(async () => {
      const prefs = await app.container.resolve(PROFILE_SERVICE).getPreferences();
      expect(prefs.lockTimeoutSec).toBe(60);
    });
    app.dispose();
  });

  it('puts back only the failed change when saving preferences fails', async () => {
    const app = await createTestApp();
    await renderWithApp(<SecurityScreen />, { app });
    await waitFor(() => expect(screen.getByTestId('timeout-30')).toBeTruthy());
    const before = (await app.container.resolve(PROFILE_SERVICE).getPreferences()).lockTimeoutSec;
    app.chaos.failNext({ endpoint: 'profile.setPreferences' }, 1);
    await fireEvent.press(screen.getByTestId(`timeout-${before === 30 ? 60 : 30}`));
    await waitFor(() => expect(screen.getByText('We are having trouble. Try later')).toBeTruthy());
    app.dispose();
  });
});
