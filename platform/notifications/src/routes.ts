import { ROUTE_PARAMS, type RouteName, type RouteRef } from '@pp/contracts-domain';

/** Routes a notification may open. Money-moving flows are never reachable from a tap. */
export const SAFE_NOTIFICATION_ROUTES: readonly RouteName[] = [
  'home',
  'history',
  'txn-detail',
  'request-detail',
  'rewards',
  'scratch-card',
  'goals',
  'goal-detail',
  'notifications',
  'settings',
  'security',
  'help',
];

export interface ValidatedRoute {
  name: RouteName;
  params: Record<string, string>;
}

export function validateNotificationRoute(ref: RouteRef): ValidatedRoute | null {
  const name = SAFE_NOTIFICATION_ROUTES.find((candidate) => candidate === ref.name);
  if (!name) return null;
  const parsed = ROUTE_PARAMS[name].safeParse(ref.params ?? {});
  if (!parsed.success) return null;
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.data as Record<string, unknown>)) {
    if (typeof value === 'string') params[key] = value;
  }
  return { name, params };
}
