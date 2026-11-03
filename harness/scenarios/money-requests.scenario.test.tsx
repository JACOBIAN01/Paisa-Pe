import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { ContactId, RequestId } from '@pp/contracts-domain';
import { RequestDetailScreen } from '@pp/feat-request-money';
import { paise } from '@pp/core-money';
import { PROFILE_SERVICE } from '@pp/svc-profile';
import { REQUESTS_SERVICE } from '@pp/svc-requests';
import { createTestApp, renderWithApp, type TestApp } from '../index';
import { addIncomingRequest, balanceOf, ensureBalance, requestRow, sendsOf } from './money-support';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
const mockParams: { current: Record<string, string> } = { current: {} };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams.current,
}));

let app: TestApp;

beforeEach(async () => {
  app = await createTestApp();
  ensureBalance(app, 500_000);
});

afterEach(() => {
  app.dispose();
  mockParams.current = {};
});

const requests = () => app.container.resolve(REQUESTS_SERVICE);

async function registeredContacts(count: number): Promise<ContactId[]> {
  const contacts = await app.root.resolve(PROFILE_SERVICE).getContacts();
  return contacts
    .filter((contact) => contact.userId !== undefined && contact.userId !== 'usr_001')
    .slice(0, count)
    .map((contact) => contact.id);
}

describe('scenario 17: pay an incoming request', () => {
  it('shows the request from another user, pays it and updates the balance', async () => {
    addIncomingRequest(app, { id: 'req_s17', amount: 18_000, note: 'Cab share' });
    const before = balanceOf(app);
    const friendBefore = balanceOf(app, 'usr_002');
    await act(async () => {
      await requests().refresh();
    });
    expect(
      requests()
        .incoming()
        .map((r) => r.id),
    ).toContain('req_s17');

    mockParams.current = { id: 'req_s17' };
    await renderWithApp(<RequestDetailScreen />, { app });
    expect((await screen.findByTestId('detail-amount')).props.children).toBe('₹180.00');
    await fireEvent.press(screen.getByTestId('detail-pay'));

    await waitFor(() => expect(requestRow(app, 'req_s17')?.status).toBe('paid'));
    expect(balanceOf(app)).toBe(before - 18_000);
    expect(balanceOf(app, 'usr_002')).toBe(friendBefore + 18_000);
    expect(requests().get('req_s17' as RequestId)?.status).toBe('paid');
  });

  it('pays a request once even when asked twice', async () => {
    addIncomingRequest(app, { id: 'req_s17b', amount: 7_000 });
    await act(async () => {
      await requests().refresh();
    });
    const before = balanceOf(app);
    await Promise.all([
      requests().pay('req_s17b' as RequestId),
      requests().pay('req_s17b' as RequestId),
    ]);
    expect(balanceOf(app)).toBe(before - 7_000);
  });
});

describe('scenario 18: create, cancel and decline requests', () => {
  it('creates an outgoing request and lets the requester cancel it', async () => {
    const [contactId] = await registeredContacts(1);
    const created = await requests().create({
      from: contactId as ContactId,
      amount: paise(9_900),
      note: 'Tickets',
    });
    expect(created.status).toBe('pending');
    await requests().refresh('outgoing');
    expect(
      requests()
        .outgoing()
        .map((r) => r.id),
    ).toContain(created.id);

    const cancelled = await requests().cancel(created.id);
    expect(cancelled.status).toBe('cancelled');
    expect(requestRow(app, created.id)?.status).toBe('cancelled');
  });

  it('declines an incoming request without moving money', async () => {
    addIncomingRequest(app, { id: 'req_s18', amount: 4_500 });
    await requests().refresh();
    const before = balanceOf(app);
    const sendsBefore = sendsOf(app).length;
    const declined = await requests().decline('req_s18' as RequestId);
    expect(declined.status).toBe('declined');
    expect(balanceOf(app)).toBe(before);
    expect(sendsOf(app)).toHaveLength(sendsBefore);
  });
});

describe('scenario 19: split an odd bill', () => {
  it('creates requests that, with the requester share, add up to the bill', async () => {
    const [first, second] = await registeredContacts(2);
    const total = paise(10_001);
    const plan = requests().planSplit(
      total,
      [{ ref: 'self' }, { ref: first as ContactId }, { ref: second as ContactId }],
      'equal',
    );
    expect(plan.ok).toBe(true);

    const { split, requests: created } = await requests().createSplit({
      total,
      mode: 'equal',
      participants: [{ ref: 'self' }, { ref: first as ContactId }, { ref: second as ContactId }],
      note: 'Dinner',
    });
    expect(created).toHaveLength(2);
    const requested = created.reduce((sum, r) => sum + r.amount, 0);
    const selfShare = split.total - split.shares.reduce((sum, s) => sum + s.share, 0);
    expect(requested + selfShare).toBe(10_001);
    expect(split.shares.reduce((sum, s) => sum + s.share, 0)).toBe(requested);
    expect(
      Math.max(...created.map((r) => r.amount)) - Math.min(...created.map((r) => r.amount)),
    ).toBeLessThanOrEqual(1);
  });
});
