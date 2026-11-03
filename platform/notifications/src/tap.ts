import { RouteRefSchema, type RouteName } from '@pp/contracts-domain';
import { appBus } from '@pp/core-event-bus';
import { createLogger } from '@pp/core-logging';
import type { TapResponse } from './adapter';
import { validateNotificationRoute } from './routes';

const log = createLogger('notifications');

export type NavigateFn = (route: RouteName, params: Record<string, string>) => void;

/** Returns true when the tap was routed. Payloads that fail validation are dropped. */
export function handleNotificationTap(
  response: TapResponse,
  navigate: NavigateFn,
  bus: Pick<typeof appBus, 'emit'> = appBus,
): boolean {
  const { identifier, content } = response.notification.request;
  const ref = RouteRefSchema.safeParse(content.data.route);
  const route = ref.success ? validateNotificationRoute(ref.data) : null;
  if (!route) {
    log.warn('dropped notification tap with invalid route', { id: identifier });
    return false;
  }
  bus.emit('notification.tapped', { id: identifier });
  navigate(route.name, route.params);
  return true;
}
