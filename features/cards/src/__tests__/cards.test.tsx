import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createTestApp, renderWithApp, type TestApp } from '@pp/harness';
import { CARDS_SERVICE } from '@pp/svc-cards';
import { CardsScreen } from '../index';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

let mockShield = false;

jest.mock('@pp/platform-lifecycle', () => ({
  ...jest.requireActual('@pp/platform-lifecycle'),
  usePrivacyShield: () => mockShield,
}));

let app: TestApp | undefined;

afterEach(() => {
  app?.dispose();
  app = undefined;
  mockShield = false;
  jest.useRealTimers();
});

describe('CardsScreen', () => {
  it('shows the masked card and reveals details on request', async () => {
    app = await createTestApp();
    const cards = app.container.resolve(CARDS_SERVICE);
    await renderWithApp(<CardsScreen />, { app });
    const pan = await screen.findByTestId('card-pan');
    expect(String(pan.props.children)).toMatch(/^•••• •••• •••• \d{4}$/);
    await fireEvent.press(screen.getByTestId('reveal-details'));
    const cvv = await screen.findByTestId('card-cvv');
    expect(String(cvv.props.children)).toMatch(/^\d{3}$/);
    expect(String(screen.getByTestId('card-pan').props.children)).toMatch(
      /^\d{4} \d{4} \d{4} \d{4}$/,
    );
    const id = cards.getCards()[0]?.id ?? '';
    expect(cards.getReveal(id)).not.toBeNull();
  });

  it('hides details when asked and wipes them from memory', async () => {
    app = await createTestApp();
    const cards = app.container.resolve(CARDS_SERVICE);
    await renderWithApp(<CardsScreen />, { app });
    await fireEvent.press(await screen.findByTestId('reveal-details'));
    await fireEvent.press(await screen.findByTestId('hide-details'));
    expect(screen.queryByTestId('card-cvv')).toBeNull();
    expect(cards.getReveal(cards.getCards()[0]?.id ?? '')).toBeNull();
  });

  it('freezes and unfreezes with the switch', async () => {
    app = await createTestApp();
    const cards = app.container.resolve(CARDS_SERVICE);
    await renderWithApp(<CardsScreen />, { app });
    const toggle = await screen.findByTestId('freeze-switch');
    await fireEvent(toggle, 'valueChange', true);
    await waitFor(() => expect(cards.getCards()[0]?.status).toBe('frozen'));
    expect(await screen.findByText('Card is frozen')).toBeTruthy();
    await fireEvent(screen.getByTestId('freeze-switch'), 'valueChange', false);
    await waitFor(() => expect(cards.getCards()[0]?.status).toBe('active'));
  });

  it('does not offer reveal while the card is frozen', async () => {
    app = await createTestApp();
    const cards = app.container.resolve(CARDS_SERVICE);
    await cards.hydrate();
    const first = (await cards.refresh())[0];
    await cards.freeze(first?.id ?? '');
    await renderWithApp(<CardsScreen />, { app });
    const button = await screen.findByTestId('reveal-details');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('hides details automatically when the countdown ends', async () => {
    app = await createTestApp();
    const cards = app.container.resolve(CARDS_SERVICE);
    await renderWithApp(<CardsScreen />, { app });
    const button = await screen.findByTestId('reveal-details');
    jest.useFakeTimers();
    await act(async () => {
      fireEvent.press(button);
      await jest.advanceTimersByTimeAsync(200);
    });
    expect(screen.getByTestId('card-cvv')).toBeTruthy();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(31_000);
    });
    expect(screen.queryByTestId('card-cvv')).toBeNull();
    expect(cards.getReveal(cards.getCards()[0]?.id ?? '')).toBeNull();
  });

  it('hides details as soon as the app leaves the foreground', async () => {
    app = await createTestApp();
    const cards = app.container.resolve(CARDS_SERVICE);
    const view = await renderWithApp(<CardsScreen />, { app });
    await fireEvent.press(await screen.findByTestId('reveal-details'));
    await screen.findByTestId('card-cvv');
    mockShield = true;
    await view.rerender(<CardsScreen />);
    await waitFor(() => expect(screen.queryByTestId('card-cvv')).toBeNull());
    expect(cards.getReveal(cards.getCards()[0]?.id ?? '')).toBeNull();
  });
});
