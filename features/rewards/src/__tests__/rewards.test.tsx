import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createTestApp, renderWithApp, type TestApp } from '@pp/harness';
import { REWARDS_SERVICE } from '@pp/svc-rewards';
import { RewardsScreen, ScratchCardScreen } from '../index';

const mockPush = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

let app: TestApp | undefined;

afterEach(() => {
  app?.dispose();
  app = undefined;
  mockPush.mockClear();
  mockParams = {};
});

describe('RewardsScreen', () => {
  it('lists coupons with eligibility for the default spend', async () => {
    app = await createTestApp();
    const rewards = app.container.resolve(REWARDS_SERVICE);
    const first = (await rewards.coupons()).data[0];
    await renderWithApp(<RewardsScreen />, { app });
    expect(await screen.findByTestId(`coupon-${first?.id}`)).toBeTruthy();
    expect(screen.getByText('Rewards')).toBeTruthy();
  });

  it('redeems an eligible coupon and refreshes the list', async () => {
    app = await createTestApp();
    const rewards = app.container.resolve(REWARDS_SERVICE);
    const spy = jest.spyOn(rewards, 'redeem');
    await renderWithApp(<RewardsScreen />, { app });
    const buttons = await screen.findAllByText('Redeem');
    await fireEvent.press(buttons[0] as never);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const id = spy.mock.calls[0]?.[0];
    await waitFor(async () => {
      const after = await rewards.coupons();
      expect(after.data.find((c) => c.id === id)?.status).toBe('redeemed');
    });
  });

  it('opens a scratch card with its id', async () => {
    app = await createTestApp();
    const card = (await app.container.resolve(REWARDS_SERVICE).scratchCards()).data[0];
    await renderWithApp(<RewardsScreen />, { app });
    await fireEvent.press(await screen.findByTestId(`scratch-${card?.id}`));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/scratch-card', params: { id: card?.id } });
  });

  it('falls back to saved offers when the network drops', async () => {
    app = await createTestApp();
    const rewards = app.container.resolve(REWARDS_SERVICE);
    await rewards.coupons();
    app.chaos.dropResponse({ endpoint: 'rewards.coupons' }, 10);
    await renderWithApp(<RewardsScreen />, { app });
    expect(await screen.findByText('Showing saved offers')).toBeTruthy();
  });
});

describe('ScratchCardScreen', () => {
  it('reveals the reward and scratches only once', async () => {
    app = await createTestApp();
    const rewards = app.container.resolve(REWARDS_SERVICE);
    const card = (await rewards.scratchCards()).data.find((c) => c.state === 'unscratched');
    mockParams = { id: card?.id ?? '' };
    const spy = jest.spyOn(rewards, 'scratch');
    await renderWithApp(<ScratchCardScreen />, { app });
    const button = await screen.findByTestId('scratch-button');
    await fireEvent.press(button);
    await fireEvent.press(button);
    expect(await screen.findByLabelText('scratch-reward')).toBeTruthy();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state for an unknown card', async () => {
    mockParams = { id: 'sc_missing' };
    const result = await renderWithApp(<ScratchCardScreen />);
    app = result.app;
    expect(await screen.findByText('No scratch cards')).toBeTruthy();
  });
});
