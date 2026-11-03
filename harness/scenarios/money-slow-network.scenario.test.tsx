import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { SendConfirmScreen } from '@pp/feat-send-money';
import { chaosControls, createTestApp, phoneOf, renderWithApp, type TestApp } from '../index';
import { balanceOf, ensureBalance, sendsOf } from './money-support';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
const mockParams: { current: Record<string, string | string[]> } = { current: {} };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams.current,
}));

let app: TestApp;

beforeEach(async () => {
  app = await createTestApp();
  ensureBalance(app, 500_000);
  mockParams.current = { to: phoneOf('usr_002'), amount: '120.00' };
});

afterEach(() => {
  app.dispose();
});

describe('scenario 14: slow network', () => {
  it('debits once when the pay button is pressed once on a slow connection', async () => {
    const controls = chaosControls(app.chaos);
    controls.slowNetwork(60);
    const before = balanceOf(app);
    const sendsBefore = sendsOf(app).length;

    await renderWithApp(<SendConfirmScreen />, { app });
    await fireEvent.press(screen.getByTestId('pay-button'));
    await waitFor(() => expect(screen.getByTestId('send-success')).toBeTruthy(), {
      timeout: 3_000,
    });

    expect(sendsOf(app)).toHaveLength(sendsBefore + 1);
    expect(balanceOf(app)).toBe(before - 12_000);
  });
});
