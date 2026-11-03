import type { RouteName } from '@pp/contracts-domain';
import { appBus, type Unsubscribe } from '@pp/core-event-bus';
import { createLogger } from '@pp/core-logging';
import { expoLinking, type LinkingAdapter, type LinkSubscription } from './linking';
import { parseDeepLink, type ParsedLink } from './parse';

const log = createLogger('deeplink');

export interface DeepLinkRouterDeps {
  linking?: LinkingAdapter;
  navigate(route: RouteName, params: Record<string, string>): void;
  /** True once persisted state (including the lock) has been read. */
  isReady(): boolean;
  isLocked(): boolean;
  /** Called with a callback to run whenever readiness or lock state may have changed. */
  subscribeUnlock(onChange: () => void): Unsubscribe;
  bus?: Pick<typeof appBus, 'emit'>;
}

export interface DeepLinkRouter {
  start(): Promise<void>;
  flush(): void;
  pending(): number;
  dispose(): void;
}

/**
 * Receives cold-start and warm links. Links wait until the app is hydrated and
 * unlocked; only the most recent waiting link is kept.
 */
export function createDeepLinkRouter(deps: DeepLinkRouterDeps): DeepLinkRouter {
  const linking = deps.linking ?? expoLinking;
  const bus = deps.bus ?? appBus;
  let queued: ParsedLink | null = null;
  let started = false;
  let disposed = false;
  let subscription: LinkSubscription | null = null;
  let unsubscribeUnlock: Unsubscribe | null = null;

  function flush(): void {
    if (disposed || queued === null) return;
    if (!deps.isReady() || deps.isLocked()) return;
    const link = queued;
    queued = null;
    try {
      deps.navigate(link.route, link.params);
    } catch (error) {
      log.error('navigation failed', { route: link.route, error: String(error) });
    }
  }

  function receive(url: string, source: 'cold' | 'warm'): void {
    if (disposed) return;
    const link = parseDeepLink(url);
    if (!link) {
      log.warn('rejected link', { source });
      return;
    }
    bus.emit('deeplink.received', { url, source });
    queued = link;
    flush();
  }

  return {
    async start() {
      if (started || disposed) return;
      started = true;
      subscription = linking.addEventListener('url', ({ url }) => receive(url, 'warm'));
      unsubscribeUnlock = deps.subscribeUnlock(flush);
      const initial = await linking.getInitialURL();
      if (initial) receive(initial, 'cold');
    },
    flush,
    pending: () => (queued ? 1 : 0),
    dispose() {
      disposed = true;
      queued = null;
      subscription?.remove();
      subscription = null;
      unsubscribeUnlock?.();
      unsubscribeUnlock = null;
    },
  };
}
