import type { ResponseLike } from '@pp/core-net';

export interface HttpRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body?: unknown;
}

export interface HttpResult {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

const decode = (value: string): string => {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
};

export function parseUrl(url: string): { path: string; query: Record<string, string> } {
  const match = /^(?:[a-z][a-z0-9+.-]*:\/\/[^/?#]*)?([^?#]*)(?:\?([^#]*))?/i.exec(url);
  const rawPath = match?.[1] ?? '/';
  const path = rawPath.length > 1 && rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath || '/';
  const query: Record<string, string> = {};
  for (const pair of (match?.[2] ?? '').split('&')) {
    if (pair === '') continue;
    const eq = pair.indexOf('=');
    const key = decode(eq === -1 ? pair : pair.slice(0, eq));
    query[key] = eq === -1 ? '' : decode(pair.slice(eq + 1));
  }
  return { path: path.startsWith('/') ? path : `/${path}`, query };
}

export function lowerHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers ?? {})) out[key.toLowerCase()] = value;
  return out;
}

export function toResponse(result: HttpResult): ResponseLike {
  const text = JSON.stringify(result.body ?? null);
  const headers = lowerHeaders({ 'content-type': 'application/json', ...result.headers });
  return {
    ok: result.status >= 200 && result.status < 300,
    status: result.status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    text: async () => text,
    json: async () => JSON.parse(text) as unknown,
  };
}
