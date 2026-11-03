import { AppError } from '@pp/core-result';

type Primitive = string | number | boolean | null | undefined;

export function fillPath(path: string, params: Record<string, Primitive> = {}): string {
  return path.replace(/:([A-Za-z_]\w*)/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined || value === null || value === '') {
      throw new AppError('invalid_request', `missing path parameter "${name}" for ${path}`);
    }
    return encodeURIComponent(String(value));
  });
}

export function toQueryString(query: Record<string, Primitive> = {}): string {
  const parts: string[] = [];
  for (const key of Object.keys(query).sort()) {
    const value = query[key];
    if (value === undefined || value === null) continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length === 0 ? '' : `?${parts.join('&')}`;
}

export function buildUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, Primitive>,
  query?: Record<string, Primitive>,
): string {
  return `${baseUrl.replace(/\/+$/, '')}${fillPath(path, params)}${toQueryString(query)}`;
}
