import { scheduleReminder } from '../schedule';
import { createFakeNotifications } from './helpers';

const clock = { now: () => 1_000, monotonic: () => 0 };
const base = { title: 'Pay rent', body: 'Due tomorrow', route: { name: 'history' }, at: 5_000 };

describe('scheduleReminder', () => {
  it('schedules with a validated route payload', async () => {
    const fake = createFakeNotifications();
    const id = await scheduleReminder(base, fake, clock);
    expect(id).toBe('n1');
    expect(fake.scheduled[0]).toEqual({
      title: 'Pay rent',
      body: 'Due tomorrow',
      at: 5_000,
      data: { route: { name: 'history', params: {} } },
    });
  });

  it('rejects money routes, past times and bad text', async () => {
    const fake = createFakeNotifications();
    await expect(
      scheduleReminder(
        { ...base, route: { name: 'send-confirm', params: { to: '+919812345678', amount: '5' } } },
        fake,
        clock,
      ),
    ).rejects.toMatchObject({ code: 'invalid_request' });
    await expect(scheduleReminder({ ...base, at: 1_000 }, fake, clock)).rejects.toThrow();
    await expect(scheduleReminder({ ...base, title: '' }, fake, clock)).rejects.toThrow();
    await expect(
      scheduleReminder({ ...base, body: 'x'.repeat(241) }, fake, clock),
    ).rejects.toThrow();
    expect(fake.scheduled).toHaveLength(0);
  });
});
