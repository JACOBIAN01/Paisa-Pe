import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { AppNotification } from '@pp/contracts-domain';
import { createTestApp, renderWithApp, type TestApp } from '@pp/harness';
import { NotificationsScreen, countUnread, targetFor } from '../index';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));

const note = (id: string, over: Partial<AppNotification> = {}): AppNotification =>
  ({
    id,
    kind: 'reward',
    title: `Title ${id}`,
    body: 'Body',
    read: false,
    createdAt: 1_700_000_000_000,
    ...over,
  }) as AppNotification;

function seed(app: TestApp, items: AppNotification[]): void {
  app.server.db.t.notifications.length = 0;
  for (const notification of items) {
    app.server.db.t.notifications.push({ ownerId: 'usr_001' as never, notification });
  }
}

afterEach(() => mockPush.mockClear());

describe('targetFor', () => {
  it('allows safe routes and rejects money-moving or unknown ones', () => {
    expect(targetFor(note('a', { route: { name: 'rewards' } }))).toEqual({
      pathname: '/rewards',
      params: {},
    });
    expect(
      targetFor(note('b', { route: { name: 'txn-detail', params: { id: 'txn_1' } } })),
    ).toEqual({ pathname: '/txn-detail', params: { id: 'txn_1' } });
    expect(
      targetFor(
        note('c', {
          route: { name: 'send-confirm', params: { to: '+919800000002', amount: '5' } },
        }),
      ),
    ).toBeNull();
    expect(targetFor(note('d', { route: { name: 'nope' } }))).toBeNull();
    expect(targetFor(note('e'))).toBeNull();
  });

  it('counts unread items', () => {
    expect(countUnread([note('a'), note('b', { read: true }), note('c')])).toBe(2);
  });
});

describe('NotificationsScreen', () => {
  it('lists the account notifications from the server', async () => {
    const app = await createTestApp();
    await renderWithApp(<NotificationsScreen />, { app });
    expect(await screen.findByText('Electricity bill due soon')).toBeTruthy();
    app.dispose();
  });

  it('shows the empty state', async () => {
    const app = await createTestApp();
    seed(app, []);
    await renderWithApp(<NotificationsScreen />, { app });
    expect(await screen.findByText('You are all caught up')).toBeTruthy();
    app.dispose();
  });

  it('marks a notification read and navigates to a safe route', async () => {
    const app = await createTestApp();
    seed(app, [note('n1', { route: { name: 'rewards' } })]);
    await renderWithApp(<NotificationsScreen />, { app });
    const row = await screen.findByTestId('notification-n1');
    await fireEvent.press(row);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/rewards', params: {} });
    await waitFor(() => expect(screen.queryByText('Unread')).toBeNull());
    const stored = app.server.db.t.notifications.find((n) => n.notification.id === 'n1');
    expect(stored?.notification.read).toBe(true);
    app.dispose();
  });

  it('never routes to a pay screen from a crafted notification', async () => {
    const app = await createTestApp();
    seed(app, [
      note('bad', {
        route: { name: 'send-confirm', params: { to: '+919800000002', amount: '9999' } },
      }),
    ]);
    await renderWithApp(<NotificationsScreen />, { app });
    await fireEvent.press(await screen.findByTestId('notification-bad'));
    expect(mockPush).not.toHaveBeenCalled();
    app.dispose();
  });

  it('marks everything read', async () => {
    const app = await createTestApp();
    seed(app, [note('a'), note('b')]);
    await renderWithApp(<NotificationsScreen />, { app });
    await fireEvent.press(await screen.findByTestId('mark-all-read'));
    await waitFor(() => expect(screen.queryByTestId('mark-all-read')).toBeNull());
    expect(app.server.db.t.notifications.every((n) => n.notification.read)).toBe(true);
    app.dispose();
  });
});
