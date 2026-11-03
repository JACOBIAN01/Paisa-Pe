import { ROUTE_PARAMS, type RouteName } from '@pp/contracts-domain';
import { parseAmount } from '@pp/core-money';
import { CUSTOM_SCHEME, LINK_PATHS, WEB_HOSTS } from './link-map';

export interface ParsedLink {
  route: RouteName;
  params: Record<string, string>;
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const CUSTOM_URL = new RegExp(`^${CUSTOM_SCHEME}://([^?#]*)(?:\\?([^#]*))?(?:#.*)?$`, 'i');
const WEB_URL = /^https:\/\/([^/?#]+)([^?#]*)(?:\?([^#]*))?(?:#.*)?$/i;

function decode(part: string): string | null {
  try {
    return decodeURIComponent(part);
  } catch {
    return null;
  }
}

/** Plain percent-decoding: `+` stays a literal plus so phone numbers survive. */
function parseQuery(query: string | undefined): Record<string, string> | null {
  const out: Record<string, string> = {};
  if (!query) return out;
  for (const pair of query.split('&')) {
    if (pair === '') continue;
    const eq = pair.indexOf('=');
    const key = decode(eq < 0 ? pair : pair.slice(0, eq));
    const value = decode(eq < 0 ? '' : pair.slice(eq + 1));
    if (key === null || value === null || key === '') return null;
    if (Object.prototype.hasOwnProperty.call(out, key)) return null;
    out[key] = value;
  }
  return out;
}

function splitTarget(url: string): { path: string; query: string | undefined } | null {
  const custom = CUSTOM_URL.exec(url);
  if (custom) return { path: custom[1] ?? '', query: custom[2] };
  const web = WEB_URL.exec(url);
  if (web && WEB_HOSTS.includes((web[1] ?? '').toLowerCase())) {
    return { path: web[2] ?? '', query: web[3] };
  }
  return null;
}

/**
 * The one parser for incoming links. Anything ambiguous (repeated keys, unknown
 * routes, params that fail the route schema, unparseable amounts) yields null.
 */
export function parseDeepLink(url: string): ParsedLink | null {
  const target = splitTarget(url.trim());
  if (!target) return null;

  const segments = target.path.split('/').filter((s) => s !== '');
  const head = segments[0]?.toLowerCase();
  const entry = head ? LINK_PATHS[head] : undefined;
  if (!entry || !Object.prototype.hasOwnProperty.call(LINK_PATHS, head ?? '')) return null;

  const expectedSegments = entry.idParam ? 2 : 1;
  if (segments.length !== expectedSegments) return null;

  const query = parseQuery(target.query);
  if (!query) return null;
  for (const key of Object.keys(query)) {
    if (key.startsWith('utm_')) delete query[key];
  }

  if (entry.idParam) {
    const id = decode(segments[1] ?? '');
    if (id === null || !ID_PATTERN.test(id) || 'id' in query) return null;
    query.id = id;
  }

  const parsed = ROUTE_PARAMS[entry.route].safeParse(query);
  if (!parsed.success) return null;

  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.data as Record<string, unknown>)) {
    if (typeof value === 'string') params[key] = value;
  }
  if (entry.route === 'send-confirm' && parseAmount(params.amount ?? '') === null) return null;
  return { route: entry.route, params };
}
