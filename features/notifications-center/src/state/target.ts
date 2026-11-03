import type { AppNotification } from '@pp/contracts-domain';
import { validateNotificationRoute } from '@pp/platform-notifications';

export interface NavTarget {
  pathname: string;
  params: Record<string, string>;
}

/**
 * Where tapping a notification may lead. Anything outside the platform allowlist
 * (money-moving screens, unknown names, malformed params) yields no target.
 */
export function targetFor(notification: AppNotification): NavTarget | null {
  if (!notification.route) return null;
  const route = validateNotificationRoute(notification.route);
  if (!route) return null;
  return { pathname: `/${route.name}`, params: route.params };
}

export const countUnread = (items: AppNotification[]): number =>
  items.reduce((n, item) => (item.read ? n : n + 1), 0);
