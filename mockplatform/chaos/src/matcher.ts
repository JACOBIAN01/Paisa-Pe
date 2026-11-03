export interface RequestInfo {
  endpoint?: string;
  method: string;
  path: string;
}

export interface RequestMatcher {
  endpoint?: string;
  method?: string;
  path?: string | RegExp;
}

export function matches(matcher: RequestMatcher | undefined, info: RequestInfo): boolean {
  if (!matcher) return true;
  if (matcher.endpoint !== undefined && matcher.endpoint !== info.endpoint) return false;
  if (matcher.method !== undefined && matcher.method.toUpperCase() !== info.method.toUpperCase())
    return false;
  if (matcher.path !== undefined) {
    return typeof matcher.path === 'string'
      ? matcher.path === info.path
      : matcher.path.test(info.path);
  }
  return true;
}
