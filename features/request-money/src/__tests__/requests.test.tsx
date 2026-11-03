import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { MoneyRequest } from '@pp/contracts-domain';
import { renderWithApp, type TestApp } from '@pp/harness';
import { REQUESTS_SERVICE } from '@pp/svc-requests';
import { RequestDetailScreen } from '../screens/RequestDetailScreen';
import { RequestScreen } from '../screens/RequestScreen';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
const mockParams: { current: Record<string, string> } = { current: {} };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams.current,
}));

let app: TestApp | undefined;

afterEach(async () => {
  await app?.dispose();
  app = undefined;
  mockParams.current = {};
});

function addIncoming(a: TestApp, id: string, amount: number, note: string, ageMs = 0) {
  const now = a.clock.now() - ageMs;
  const request = {
    id,
    requesterId: 'usr_002',
    payerId: 'usr_001',
    amount,
    note,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    expiresAt: now + 86_400_000,
  } as unknown as MoneyRequest;
  (a.server.db.t.requests as MoneyRequest[]).push(request);
}

const statusOf = (a: TestApp, id: string) =>
  (a.server.db.t.requests as MoneyRequest[]).find((r) => r.id === id)?.status;

describe('RequestScreen', () => {
  it('lists incoming requests with the requester name', async () => {
    const view = await renderWithApp(<RequestScreen />);
    app = view.app;
    addIncoming(app, 'req_a', 15000, 'Dinner');
    await act(async () => {
      await app?.container.resolve(REQUESTS_SERVICE).refresh();
    });
    await waitFor(() => expect(screen.getByTestId('request-req_a')).toBeTruthy());
    expect(screen.getAllByText('Diya Patel').length).toBeGreaterThan(0);
    expect(screen.getByText('Dinner')).toBeTruthy();
  });

  it('shows an empty state when nothing is waiting', async () => {
    ({ app } = await renderWithApp(<RequestScreen />));
    await waitFor(() => expect(screen.getByText('Nothing to pay')).toBeTruthy());
  });

  it('pays the selected request from the sheet', async () => {
    const view = await renderWithApp(<RequestScreen />);
    app = view.app;
    addIncoming(app, 'req_a', 15000, 'Dinner');
    await act(async () => {
      await app?.container.resolve(REQUESTS_SERVICE).refresh();
    });
    const before = app.admin.getBalance('usr_001').balance;
    await fireEvent.press(await screen.findByTestId('request-req_a'));
    expect(screen.getByTestId('pay-sheet-summary').props.children).toContain('₹150.00');
    await fireEvent.press(screen.getByTestId('pay-sheet-confirm'));
    await waitFor(() => expect(statusOf(app!, 'req_a')).toBe('paid'));
    expect(app.admin.getBalance('usr_001').balance).toBe(before - 15000);
  });

  it('keeps the sheet on the chosen request when a newer one arrives on top', async () => {
    const view = await renderWithApp(<RequestScreen />);
    app = view.app;
    addIncoming(app, 'req_old', 11100, 'Old one', 60_000);
    await act(async () => {
      await app?.container.resolve(REQUESTS_SERVICE).refresh();
    });
    await fireEvent.press(await screen.findByTestId('request-req_old'));
    addIncoming(app, 'req_new', 99900, 'Brand new');
    await act(async () => {
      await app?.container.resolve(REQUESTS_SERVICE).refresh();
    });
    expect(screen.getByTestId('pay-sheet-summary').props.children).toContain('₹111.00');
    await fireEvent.press(screen.getByTestId('pay-sheet-confirm'));
    await waitFor(() => expect(statusOf(app!, 'req_old')).toBe('paid'));
    expect(statusOf(app, 'req_new')).toBe('pending');
  });

  it('creates a request for a contact', async () => {
    ({ app } = await renderWithApp(<RequestScreen />));
    await fireEvent.press(await screen.findByTestId('pick-ct_001_01'));
    await fireEvent.changeText(screen.getByTestId('amount-input'), '75');
    await fireEvent.press(screen.getByTestId('create-request-submit'));
    await waitFor(() =>
      expect((app!.server.db.t.requests as MoneyRequest[]).some((r) => r.amount === 7500)).toBe(
        true,
      ),
    );
    await fireEvent.press(screen.getByTestId('tab-outgoing'));
    await waitFor(() => expect(screen.getByText('₹75.00')).toBeTruthy());
  });
});

describe('RequestDetailScreen', () => {
  it('declines a pending incoming request', async () => {
    mockParams.current = { id: 'req_d' };
    const view = await renderWithApp(<RequestDetailScreen />);
    app = view.app;
    addIncoming(app, 'req_d', 5000, 'Snacks');
    await act(async () => {
      await app?.container.resolve(REQUESTS_SERVICE).refresh();
    });
    await fireEvent.press(await screen.findByTestId('detail-decline'));
    await waitFor(() => expect(statusOf(app!, 'req_d')).toBe('declined'));
  });

  it('shows a not-found state for an unknown id', async () => {
    mockParams.current = { id: 'req_missing' };
    ({ app } = await renderWithApp(<RequestDetailScreen />));
    await waitFor(() => expect(screen.getByTestId('request-not-found')).toBeTruthy());
  });
});
