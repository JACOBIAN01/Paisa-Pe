import { endpoints, type EndpointDef, type EndpointName } from '@pp/contracts-api';

export interface RouteMatch {
  name: EndpointName;
  def: EndpointDef;
  params: Record<string, string>;
}

interface CompiledRoute extends RouteMatch {
  method: string;
  segments: string[];
}

const split = (path: string): string[] => path.split('/').filter((s) => s !== '');

const routes: CompiledRoute[] = (Object.keys(endpoints) as EndpointName[])
  .map((name) => {
    const def: EndpointDef = endpoints[name];
    return { name, def, method: def.method, segments: split(def.path), params: {} };
  })
  .sort(
    (a, b) =>
      a.segments.filter((s) => s.startsWith(':')).length -
      b.segments.filter((s) => s.startsWith(':')).length,
  );

export function matchRoute(method: string, path: string): RouteMatch | undefined {
  const parts = split(path);
  for (const route of routes) {
    if (route.method !== method.toUpperCase() || route.segments.length !== parts.length) continue;
    const params: Record<string, string> = {};
    const ok = route.segments.every((segment, i) => {
      const part = parts[i] as string;
      if (!segment.startsWith(':')) return segment === part;
      params[segment.slice(1)] = decodeURIComponent(part);
      return true;
    });
    if (ok) return { name: route.name, def: route.def, params };
  }
  return undefined;
}
