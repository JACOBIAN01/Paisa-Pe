import type { RouteName } from '@pp/contracts-domain';
import { parseDeepLink } from '@pp/platform-deeplink';

export interface QrTarget {
  route: Extract<RouteName, 'send' | 'send-confirm'>;
  params: Record<string, string>;
}

/**
 * Turns scanned text into a destination. Only payment links are accepted; anything else a QR
 * code might carry (other routes, other schemes, malformed or ambiguous links) is rejected.
 */
export function parseQrPayload(text: string): QrTarget | null {
  const link = parseDeepLink(text);
  if (!link) return null;
  if (link.route === 'send' || link.route === 'send-confirm') {
    return { route: link.route, params: link.params };
  }
  return null;
}

export const buildMyQrPayload = (phone: string): string =>
  `paisape://send?to=${encodeURIComponent(phone)}`;
