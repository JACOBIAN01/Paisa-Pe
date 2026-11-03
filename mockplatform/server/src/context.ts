import type {
  EndpointBody,
  EndpointName,
  EndpointParams,
  EndpointQuery,
  endpoints,
} from '@pp/contracts-api';
import type { IdempotencyKey, SessionId, UserId } from '@pp/contracts-domain';
import type { Database } from '@pp/mock-db';
import type { HttpRequest } from './http';

type Def<N extends EndpointName> = (typeof endpoints)[N];

export interface OpenCtx<N extends EndpointName> {
  db: Database;
  /** Server time (includes any injected clock skew). */
  now: number;
  req: HttpRequest;
  params: EndpointParams<Def<N>>;
  query: EndpointQuery<Def<N>>;
  body: EndpointBody<Def<N>>;
  idempotencyKey?: IdempotencyKey;
}

export interface AuthCtx<N extends EndpointName> extends OpenCtx<N> {
  userId: UserId;
  sessionId: SessionId;
}

export interface HandlerEntry {
  auth: boolean;
  run: (ctx: AuthCtx<EndpointName>) => unknown;
}

export type HandlerTable = Record<EndpointName, HandlerEntry>;

export interface Registry {
  open<N extends EndpointName>(name: N, run: (ctx: OpenCtx<N>) => unknown): void;
  auth<N extends EndpointName>(name: N, run: (ctx: AuthCtx<N>) => unknown): void;
  entries(): Map<EndpointName, HandlerEntry>;
}

export function createRegistry(): Registry {
  const map = new Map<EndpointName, HandlerEntry>();
  const add = (name: EndpointName, auth: boolean, run: unknown): void => {
    if (map.has(name)) throw new Error(`duplicate handler for ${name}`);
    map.set(name, { auth, run: run as HandlerEntry['run'] });
  };
  return {
    open: (name, run) => add(name, false, run),
    auth: (name, run) => add(name, true, run),
    entries: () => map,
  };
}
