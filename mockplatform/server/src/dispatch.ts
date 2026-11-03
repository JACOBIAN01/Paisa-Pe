import { ZodError } from 'zod';
import type { EndpointName } from '@pp/contracts-api';
import type { Database } from '@pp/mock-db';
import { authenticate } from './auth-check';
import type { AuthCtx, HandlerTable } from './context';
import { ApiFailure, errorBody, fail } from './errors';
import { buildHandlers } from './handlers';
import type { HttpRequest, HttpResult } from './http';
import { readKey, runIdempotent } from './idempotency';
import { matchRoute } from './router';

const parse = (
  schema: { parse(input: unknown): unknown } | undefined,
  input: unknown,
  what: string,
): unknown => {
  if (!schema) return undefined;
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      throw fail('invalid_request', `Invalid ${what}`, {
        issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    throw error;
  }
};

export interface Dispatcher {
  handle(req: HttpRequest): HttpResult;
  routeName(method: string, path: string): EndpointName | undefined;
}

export function createDispatcher(db: () => Database, now: () => number): Dispatcher {
  const handlers: HandlerTable = buildHandlers();

  function process(req: HttpRequest): HttpResult {
    const route = matchRoute(req.method, req.path);
    if (!route) throw fail('not_found', `No route for ${req.method} ${req.path}`);
    const entry = handlers[route.name];
    const database = db();
    const at = now();
    const headers: Record<string, string> = {};

    const identity = entry.auth ? authenticate(database, at, req.headers) : undefined;
    const params = parse(route.def.params, route.params, 'path parameters');
    const query = parse(route.def.query, req.query, 'query');
    const body = parse(route.def.body, req.body ?? {}, 'body');
    const ctx = {
      db: database,
      now: at,
      req,
      params,
      query,
      body,
      userId: identity?.userId,
      sessionId: identity?.sessionId,
    } as unknown as AuthCtx<EndpointName>;

    const execute = (): unknown => route.def.response.parse(entry.run(ctx));
    let result: unknown;
    if (route.def.idempotent && identity) {
      ctx.idempotencyKey = readKey(req.headers);
      const outcome = runIdempotent(
        database,
        at,
        {
          userId: identity.userId,
          endpoint: route.name,
          key: ctx.idempotencyKey,
          fingerprint: { params, query, body },
        },
        execute,
      );
      result = outcome.body;
      if (outcome.replayed) headers['idempotency-replayed'] = 'true';
    } else {
      result = execute();
    }
    return { status: 200, body: result, headers };
  }

  return {
    routeName: (method, path) => matchRoute(method, path)?.name,
    handle(req) {
      try {
        return process(req);
      } catch (error) {
        if (error instanceof ApiFailure) {
          return { status: error.status, body: errorBody(error), headers: {} };
        }
        const message = error instanceof Error ? error.message : 'Unexpected error';
        const failure = fail('server_error', message);
        return { status: failure.status, body: errorBody(failure), headers: {} };
      }
    },
  };
}
