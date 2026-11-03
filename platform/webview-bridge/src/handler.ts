import { ROUTE_PARAMS, type RouteName } from '@pp/contracts-domain';
import { WebToNativeSchema, type NativeToWeb } from '@pp/contracts-ipc';
import { createLogger } from '@pp/core-logging';
import { buildInitScript } from './init-script';
import { HELP_ORIGINS, SAFE_HELP_ROUTES, isAllowedOrigin, shouldStartLoad } from './origins';

const log = createLogger('webview-bridge');
const MAX_MESSAGE_CHARS = 4_096;

export interface BridgeEvent {
  nativeEvent: { data: string; url: string };
}

export type BridgeResult = 'handled' | 'rejected_origin' | 'invalid' | 'blocked_route';

export interface BridgeDeps {
  allowedOrigins?: readonly string[];
  navigate(route: RouteName): void;
  openArticle(articleId: string): void;
  onResize(height: number): void;
  onContactSupport(topic: 'payments' | 'account' | 'cards' | 'other'): void;
  onClose(): void;
  getInitMessage(): NativeToWeb;
  injectScript?(script: string): void;
}

export interface BridgeHandler {
  onMessage(event: BridgeEvent): BridgeResult;
  shouldStartLoad(url: string): boolean;
}

function safeRoute(name: string): RouteName | null {
  const route = SAFE_HELP_ROUTES.find((candidate) => candidate === name);
  if (!route) return null;
  return ROUTE_PARAMS[route].safeParse({}).success ? route : null;
}

export function createBridgeHandler(deps: BridgeDeps): BridgeHandler {
  const allowed = deps.allowedOrigins ?? HELP_ORIGINS;

  return {
    shouldStartLoad: (url) => shouldStartLoad(url, allowed),
    onMessage({ nativeEvent }) {
      if (!isAllowedOrigin(nativeEvent.url, allowed)) {
        log.warn('bridge message from untrusted origin');
        return 'rejected_origin';
      }
      if (nativeEvent.data.length > MAX_MESSAGE_CHARS) return 'invalid';

      let raw: unknown;
      try {
        raw = JSON.parse(nativeEvent.data);
      } catch {
        return 'invalid';
      }
      const parsed = WebToNativeSchema.safeParse(raw);
      if (!parsed.success) {
        log.warn('bridge message failed validation');
        return 'invalid';
      }

      const message = parsed.data;
      switch (message.type) {
        case 'ready':
          deps.injectScript?.(buildInitScript(deps.getInitMessage()));
          return 'handled';
        case 'resize':
          deps.onResize(message.payload.height);
          return 'handled';
        case 'navigate': {
          const route = safeRoute(message.payload.route);
          if (!route) {
            log.warn('bridge navigation blocked');
            return 'blocked_route';
          }
          deps.navigate(route);
          return 'handled';
        }
        case 'open-article':
          deps.openArticle(message.payload.articleId);
          return 'handled';
        case 'contact-support':
          deps.onContactSupport(message.payload.topic);
          return 'handled';
        case 'close':
          deps.onClose();
          return 'handled';
      }
    },
  };
}
