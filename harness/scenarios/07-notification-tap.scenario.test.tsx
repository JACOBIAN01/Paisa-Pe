import { Text } from 'react-native';
import { screen } from '@testing-library/react-native';
import { scheduleReminder, useNotificationTaps } from '@pp/platform-notifications';
import {
  createFakeNotifications,
  createTestApp,
  recordEvents,
  renderWithApp,
  type FakeNotifications,
} from '@pp/harness';

function Listener({
  adapter,
  navigate,
}: {
  adapter: FakeNotifications;
  navigate: (route: string, params: Record<string, string>) => void;
}) {
  useNotificationTaps(navigate, adapter);
  return <Text testID="listener">listening</Text>;
}

describe('scenario: tapping a notification', () => {
  it('opens an allowed screen with its parameters', async () => {
    const app = await createTestApp();
    const events = recordEvents();
    const adapter = createFakeNotifications();
    const navigate = jest.fn();
    await renderWithApp(<Listener adapter={adapter} navigate={navigate} />, { app });

    adapter.tap('n1', { name: 'goal-detail', params: { id: 'goal_1' } });
    expect(navigate).toHaveBeenCalledWith('goal-detail', { id: 'goal_1' });
    adapter.tap('n2', { name: 'home' });
    expect(navigate).toHaveBeenLastCalledWith('home', {});
    expect(events.of('notification.tapped')).toEqual([{ id: 'n1' }, { id: 'n2' }]);
    events.stop();
    await screen.unmount();
    app.dispose();
  });

  it('never opens a payment screen, even with a complete payload', async () => {
    const app = await createTestApp();
    const events = recordEvents();
    const adapter = createFakeNotifications();
    const navigate = jest.fn();
    await renderWithApp(<Listener adapter={adapter} navigate={navigate} />, { app });

    adapter.tap('n3', {
      name: 'send-confirm',
      params: { to: '+919800000002', amount: '9999.00' },
    });
    adapter.tap('n4', { name: 'send', params: {} });
    adapter.tap('n5', { name: 'txn-detail', params: { id: 42 } });
    adapter.tap('n6', 'send-confirm');
    expect(navigate).not.toHaveBeenCalled();
    expect(events.count('notification.tapped')).toBe(0);
    events.stop();
    await screen.unmount();
    app.dispose();
  });

  it('round-trips a reminder scheduled by the app', async () => {
    const app = await createTestApp();
    const adapter = createFakeNotifications();
    const navigate = jest.fn();
    await scheduleReminder(
      {
        title: 'Review your goal',
        body: 'You are close to your target',
        route: { name: 'goal-detail', params: { id: 'goal_2' } },
        at: app.clock.now() + 60_000,
      },
      adapter,
      app.clock,
    );
    expect(adapter.scheduled).toHaveLength(1);

    await renderWithApp(<Listener adapter={adapter} navigate={navigate} />, { app });
    const payload = adapter.scheduled[0]?.data.route;
    adapter.tap('scheduled-1', payload);
    expect(navigate).toHaveBeenCalledWith('goal-detail', { id: 'goal_2' });
    await screen.unmount();
    expect(adapter.listenerCount()).toBe(0);
    app.dispose();
  });
});
