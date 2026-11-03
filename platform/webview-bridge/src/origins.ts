import type { RouteName } from '@pp/contracts-domain';

export const HELP_ORIGINS: readonly string[] = ['https://help.paisape.app'];

/** Parameterless, non-payment screens a help article may open. */
export const SAFE_HELP_ROUTES: readonly RouteName[] = [
  'home',
  'history',
  'rewards',
  'goals',
  'cards',
  'settings',
  'security',
  'kyc',
  'contacts',
  'notifications',
  'help',
];

const ORIGIN = /^(https?):\/\/([^/?#]+)/i;

/** `scheme://host[:port]` in lower case, or null for anything that is not a plain http(s) URL. */
export function originOf(url: string): string | null {
  const match = ORIGIN.exec(url.trim());
  if (!match) return null;
  const authority = match[2] ?? '';
  if (authority.includes('@') || authority.includes('\\')) return null;
  return `${(match[1] ?? '').toLowerCase()}://${(match[2] ?? '').toLowerCase()}`;
}

export function isAllowedOrigin(url: string, allowed: readonly string[] = HELP_ORIGINS): boolean {
  const origin = originOf(url);
  return origin !== null && allowed.includes(origin);
}

/** Navigation gate for the WebView: only allowed origins load inside it. */
export const shouldStartLoad = (url: string, allowed: readonly string[] = HELP_ORIGINS): boolean =>
  isAllowedOrigin(url, allowed);
