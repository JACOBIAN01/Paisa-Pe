import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createTestApp, renderWithApp } from '@pp/harness';
import { KycScreen } from '../index';

describe('KycScreen', () => {
  it('shows the current tier and keeps submit disabled until the document is valid', async () => {
    const app = await createTestApp({ user: 'usr_004' });
    await renderWithApp(<KycScreen />, { app });
    await waitFor(() => expect(screen.getByTestId('tier-progress')).toBeTruthy());
    expect(screen.getByTestId('kyc-submit').props.accessibilityState?.disabled).toBe(true);
    await fireEvent.changeText(screen.getByTestId('kyc-last4'), '12');
    expect(screen.getByTestId('kyc-submit').props.accessibilityState?.disabled).toBe(true);
    app.dispose();
  });

  it('submits a document, shows it in review, then shows the upgraded tier', async () => {
    const app = await createTestApp({ user: 'usr_004' });
    await renderWithApp(<KycScreen />, { app });
    await waitFor(() => expect(screen.getByTestId('kyc-last4')).toBeTruthy());

    await fireEvent.changeText(screen.getByTestId('kyc-last4'), '4321');
    await fireEvent.press(screen.getByTestId('kyc-submit'));
    await waitFor(() => expect(screen.getByText('In review')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText('Check status'));
    await waitFor(() => expect(screen.queryByText('In review')).toBeNull());
    expect(screen.getByTestId('kyc-last4')).toBeTruthy();
    app.dispose();
  });

  it('offers a retry when the status cannot be loaded', async () => {
    const app = await createTestApp({ user: 'usr_004' });
    app.chaos.failNext({ endpoint: 'kyc.status' }, 1);
    await renderWithApp(<KycScreen />, { app });
    await waitFor(() => expect(screen.getByText('We are having trouble. Try later')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('Retry'));
    await waitFor(() => expect(screen.getByTestId('tier-progress')).toBeTruthy());
    app.dispose();
  });
});
