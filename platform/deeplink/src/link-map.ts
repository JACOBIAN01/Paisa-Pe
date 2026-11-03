import type { RouteName } from '@pp/contracts-domain';

/** First path segment of a link to the route it opens. `idParam` marks routes that take a trailing id. */
export const LINK_PATHS: Readonly<Record<string, { route: RouteName; idParam?: true }>> = {
  home: { route: 'home' },
  history: { route: 'history' },
  txn: { route: 'txn-detail', idParam: true },
  send: { route: 'send' },
  pay: { route: 'send-confirm' },
  request: { route: 'request' },
  requests: { route: 'request-detail', idParam: true },
  split: { route: 'split' },
  rewards: { route: 'rewards' },
  scratch: { route: 'scratch-card', idParam: true },
  goals: { route: 'goals' },
  goal: { route: 'goal-detail', idParam: true },
  cards: { route: 'cards' },
  bills: { route: 'bills' },
  settings: { route: 'settings' },
  help: { route: 'help' },
  security: { route: 'security' },
  kyc: { route: 'kyc' },
  scan: { route: 'qr-scan' },
  contacts: { route: 'contacts' },
  notifications: { route: 'notifications' },
};

export const SENSITIVE_ROUTES: readonly RouteName[] = ['send-confirm'];

export const isSensitiveRoute = (route: RouteName): boolean => SENSITIVE_ROUTES.includes(route);

export const CUSTOM_SCHEME = 'paisape';
export const WEB_HOSTS: readonly string[] = ['paisape.app'];
