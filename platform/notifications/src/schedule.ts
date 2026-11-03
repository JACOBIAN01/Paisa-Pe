import type { RouteRef } from '@pp/contracts-domain';
import { AppError } from '@pp/core-result';
import { getClock, type Clock } from '@pp/core-time';
import { expoNotifications, type NotificationsAdapter } from './adapter';
import { validateNotificationRoute } from './routes';

export interface ReminderInput {
  title: string;
  body: string;
  route: RouteRef;
  /** Epoch milliseconds. */
  at: number;
}

const MAX_TITLE = 80;
const MAX_BODY = 240;

export async function scheduleReminder(
  input: ReminderInput,
  adapter: NotificationsAdapter = expoNotifications,
  clock: Clock = getClock(),
): Promise<string> {
  const route = validateNotificationRoute(input.route);
  if (!route) throw new AppError('invalid_request', 'Reminder route is not allowed');
  if (input.title.length === 0 || input.title.length > MAX_TITLE) {
    throw new AppError('invalid_request', 'Reminder title has an invalid length');
  }
  if (input.body.length > MAX_BODY) {
    throw new AppError('invalid_request', 'Reminder body is too long');
  }
  if (input.at <= clock.now())
    throw new AppError('invalid_request', 'Reminder must be in the future');

  return adapter.schedule({
    title: input.title,
    body: input.body,
    at: input.at,
    data: { route: { name: route.name, params: route.params } },
  });
}
