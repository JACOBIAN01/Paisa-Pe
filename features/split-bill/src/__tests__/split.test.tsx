import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { MoneyRequest } from '@pp/contracts-domain';
import { renderWithApp, type TestApp } from '@pp/harness';
import { parsePercentBps } from '../state/percent';
import { SplitScreen } from '../screens/SplitScreen';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
}));

let app: TestApp | undefined;

afterEach(async () => {
  await app?.dispose();
  app = undefined;
  mockRouter.replace.mockClear();
});

const share = (ref: string) => String(screen.getByTestId(`share-${ref}`).props.children);
const splitRequests = (a: TestApp) =>
  (a.server.db.t.requests as MoneyRequest[]).filter(
    (r) => r.requesterId === 'usr_001' && r.splitId !== undefined,
  );

async function pick(...ids: string[]) {
  for (const id of ids) {
    await fireEvent.press(await screen.findByTestId(`split-pick-${id}`));
  }
}

describe('parsePercentBps', () => {
  it.each([
    ['50', 5000],
    ['12.5', 1250],
    ['33.33', 3333],
    ['100', 10000],
  ])('parses %s', (text, bps) => expect(parsePercentBps(text)).toBe(bps));

  it.each(['', 'abc', '100.01', '1e2', '-5', '12.345'])('rejects %s', (text) =>
    expect(parsePercentBps(text)).toBeNull(),
  );
});

describe('SplitScreen', () => {
  it('splits an uneven bill so the shares add up exactly', async () => {
    ({ app } = await renderWithApp(<SplitScreen />));
    await fireEvent.changeText(screen.getByTestId('amount-input'), '100.01');
    await pick('ct_001_01', 'ct_001_02');
    const shares = [share('self'), share('ct_001_01'), share('ct_001_02')];
    expect(shares).toEqual(['₹33.34 each', '₹33.34 each', '₹33.33 each']);
    expect(screen.getByTestId('remainder-note')).toBeTruthy();
  });

  it('keeps the preview in step as people are added and removed', async () => {
    ({ app } = await renderWithApp(<SplitScreen />));
    await fireEvent.changeText(screen.getByTestId('amount-input'), '90');
    await pick('ct_001_01');
    expect(share('ct_001_01')).toBe('₹45.00 each');
    await pick('ct_001_02');
    expect(share('ct_001_01')).toBe('₹30.00 each');
    await pick('ct_001_01');
    expect(screen.queryByTestId('share-ct_001_01')).toBeNull();
    expect(share('ct_001_02')).toBe('₹45.00 each');
  });

  it('sends requests for exactly the people selected when the button is pressed', async () => {
    ({ app } = await renderWithApp(<SplitScreen />));
    await fireEvent.changeText(screen.getByTestId('amount-input'), '100.01');
    await pick('ct_001_01');
    await pick('ct_001_02');
    await fireEvent.press(screen.getByTestId('split-submit'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/request'));
    const created = splitRequests(app);
    expect(created).toHaveLength(2);
    expect(created.reduce((sum, r) => sum + r.amount, 0)).toBe(10001 - 3334);
  });

  it('shows why a custom split cannot be sent', async () => {
    ({ app } = await renderWithApp(<SplitScreen />));
    await fireEvent.changeText(screen.getByTestId('amount-input'), '100');
    await pick('ct_001_01');
    await fireEvent.press(screen.getByTestId('mode-custom'));
    await fireEvent.changeText(screen.getByTestId('split-value-self'), '30');
    await fireEvent.changeText(screen.getByTestId('split-value-ct_001_01'), '30');
    await waitFor(() => expect(screen.getByText(/add up to the bill/i)).toBeTruthy());
    expect(screen.getByTestId('split-submit').props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByTestId('split-value-ct_001_01'), '70');
    await waitFor(() =>
      expect(screen.getByTestId('split-submit').props.accessibilityState.disabled).toBe(false),
    );
  });

  it('splits by percentage', async () => {
    ({ app } = await renderWithApp(<SplitScreen />));
    await fireEvent.changeText(screen.getByTestId('amount-input'), '200');
    await pick('ct_001_01');
    await fireEvent.press(screen.getByTestId('mode-percent'));
    await fireEvent.changeText(screen.getByTestId('split-value-self'), '25');
    await fireEvent.changeText(screen.getByTestId('split-value-ct_001_01'), '75');
    await waitFor(() => expect(share('ct_001_01')).toBe('₹150.00 each'));
    expect(share('self')).toBe('₹50.00 each');
  });
});
