import { Fragment, useRef, useSyncExternalStore, type ReactElement, type ReactNode } from 'react';
import { LockScreen } from '@pp/feat-auth';
import { useIsLocked } from '@pp/platform-lifecycle';

type Params = Record<string, string | string[]>;
type Target = string | { pathname: string; params?: Record<string, unknown> };

export interface NavLocation {
  path: string;
  params: Params;
}

export interface Nav {
  /** Shaped like expo-router's `useRouter()` result. */
  router: {
    push(target: Target): void;
    replace(target: Target): void;
    back(): void;
  };
  /** What a screen's `useLocalSearchParams()` should return. */
  params(): Params;
  location(): NavLocation;
  /** Every location visited, oldest first. */
  trail(): NavLocation[];
  subscribe(listener: () => void): () => void;
}

const toParams = (input: Record<string, unknown> | undefined): Params => {
  const out: Params = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    out[key] = Array.isArray(value) ? value.map(String) : String(value);
  }
  return out;
};

function resolve(target: Target): NavLocation {
  if (typeof target !== 'string') return { path: target.pathname, params: toParams(target.params) };
  const [path = '/', query = ''] = target.split('?');
  const params: Params = {};
  for (const pair of query.split('&').filter(Boolean)) {
    const [key = '', value = ''] = pair.split('=');
    params[key] = decodeURIComponent(value);
  }
  return { path, params };
}

/**
 * A minimal in-memory router for scenario tests. Wire it into a `jest.mock('expo-router')`
 * factory (`useRouter: () => nav.router`, `useLocalSearchParams: () => nav.params()`) and
 * render `<AppShell nav={nav} screens={...} />` to see the current screen.
 */
export function createNav(initialPath = '/'): Nav {
  const stack: NavLocation[] = [{ path: initialPath, params: {} }];
  const trail: NavLocation[] = [...stack];
  const listeners = new Set<() => void>();
  const notify = (): void => listeners.forEach((listener) => listener());
  const current = (): NavLocation => stack[stack.length - 1] as NavLocation;

  return {
    router: {
      push(target) {
        const next = resolve(target);
        stack.push(next);
        trail.push(next);
        notify();
      },
      replace(target) {
        const next = resolve(target);
        stack[stack.length - 1] = next;
        trail.push(next);
        notify();
      },
      back() {
        if (stack.length > 1) stack.pop();
        notify();
      },
    },
    params: () => current().params,
    location: current,
    trail: () => [...trail],
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

export interface AppShellProps {
  nav: Nav;
  /** Screens by path, e.g. `{ '/home': <HomeScreen /> }`. */
  screens: Record<string, ReactElement>;
}

/**
 * The part of the app root that matters to these tests: while the app is locked the lock
 * gate is shown instead of the current screen, exactly as the app shell does.
 */
export function AppShell({ nav, screens }: AppShellProps) {
  const locked = useIsLocked();
  const location = useSyncExternalStore(nav.subscribe, nav.location);
  if (locked) return <LockScreen />;
  return screens[location.path] ?? null;
}

function useIdentityKey(value: object): number {
  const last = useRef<{ value: object; key: number } | null>(null);
  if (last.current === null || last.current.value !== value) {
    last.current = { value, key: (last.current?.key ?? 0) + 1 };
  }
  return last.current.key;
}

/**
 * Gives each set of services its own tree, like the app root does: when the active account
 * (and so its container) changes, the screens inside are remounted instead of keeping the
 * previous account's state. Pass the container you are rendering with.
 */
export function AccountScope({ container, children }: { container: object; children: ReactNode }) {
  return <Fragment key={useIdentityKey(container)}>{children}</Fragment>;
}
