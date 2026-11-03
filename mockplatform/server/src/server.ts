import type { FetchLike, RequestInitLike } from '@pp/core-net';
import { getClock, type Clock } from '@pp/core-time';
import { createAdmin, type MockAdmin } from '@pp/mock-admin';
import { abortError, createChaos, hang, wait, type Chaos } from '@pp/mock-chaos';
import {
  createDatabase,
  loadDatabase,
  saveDatabase,
  seedDatabase,
  type Database,
  type PersistenceBackend,
} from '@pp/mock-db';
import { createDispatcher } from './dispatch';
import { ApiFailure, errorBody, fail } from './errors';
import { lowerHeaders, parseUrl, toResponse, type HttpRequest, type HttpResult } from './http';

export interface MockServerOptions {
  /** Base clock for server time; defaults to the app-wide clock from core-time. */
  clock?: Clock;
  seed?: number;
  chaos?: Chaos;
  persistence?: { backend: PersistenceBackend; key?: string };
}

export interface MockServer {
  /** Network entry point; latency and chaos apply. */
  fetch: FetchLike;
  /** Synchronous in-process entry point; no latency or chaos. */
  handle(req: HttpRequest): HttpResult;
  admin: MockAdmin;
  db: Database;
  chaos: Chaos;
  /** Server time: the base clock plus any injected skew. */
  now(): number;
  /** Resolves once persisted state (if any) has been loaded. */
  ready: Promise<void>;
  /** Resolves once pending writes to the persistence backend have finished. */
  flush(): Promise<void>;
}

const DEFAULT_SEED = 1;

function parseBody(text: string | undefined): unknown {
  if (text === undefined || text === '') return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw fail('invalid_request', 'Body is not valid JSON');
  }
}

export function createMockServer(options: MockServerOptions = {}): MockServer {
  const baseClock = (): Clock => options.clock ?? getClock();
  const chaos = options.chaos ?? createChaos(options.seed ?? DEFAULT_SEED);
  const seed = options.seed ?? DEFAULT_SEED;
  const now = (): number => baseClock().now() + chaos.getClockSkew();

  const db = createDatabase(seed);
  seedDatabase(db, baseClock().now());

  const reseed = (nextSeed: number): void => {
    const fresh = createDatabase(nextSeed);
    seedDatabase(fresh, baseClock().now());
    db.restore(fresh.snapshot());
  };

  const dispatcher = createDispatcher(() => db, now);
  const persistence = options.persistence;
  let writes: Promise<void> = Promise.resolve();
  const persist = (): void => {
    if (!persistence) return;
    writes = writes
      .then(() => saveDatabase(db, persistence.backend, persistence.key))
      .catch(() => undefined);
  };
  const ready: Promise<void> = persistence
    ? loadDatabase(db, persistence.backend, persistence.key).then(() => undefined)
    : Promise.resolve();

  const handle = (req: HttpRequest): HttpResult => {
    const result = dispatcher.handle(req);
    if (req.method.toUpperCase() !== 'GET' && result.status < 400) persist();
    return result;
  };

  const fetchImpl: FetchLike = async (url: string, init?: RequestInitLike) => {
    await ready;
    const signal = init?.signal;
    const method = (init?.method ?? 'GET').toUpperCase();
    const { path, query } = parseUrl(url);
    const plan = chaos.plan({ endpoint: dispatcher.routeName(method, path), method, path });

    await wait(plan.uplinkMs, signal);
    if (plan.action.kind === 'timeout') return hang(signal);

    let result: HttpResult;
    if (plan.action.kind === 'fail') {
      const { status, code, message, retryable } = plan.action.response;
      const failure = new ApiFailure('server_error', message, undefined, status);
      result = {
        status,
        body: { error: { ...errorBody(failure).error, code, retryable } },
        headers: {},
      };
    } else {
      try {
        result = handle({
          method,
          path,
          query,
          headers: lowerHeaders(init?.headers),
          body: parseBody(init?.body),
        });
      } catch (error) {
        if (!(error instanceof ApiFailure)) throw error;
        result = { status: error.status, body: errorBody(error), headers: {} };
      }
    }
    result.headers['x-server-time'] = String(now());

    await wait(plan.downlinkMs, signal);
    if (plan.action.kind === 'drop') {
      if (plan.action.mode === 'hang') return hang(signal);
      if (signal?.aborted) throw abortError();
      throw new TypeError('Network request failed');
    }
    return toResponse(result);
  };

  const manual = (): { advance?: (ms: number) => void } =>
    baseClock() as { advance?: (ms: number) => void };
  const admin = createAdmin({
    db,
    chaos,
    now,
    initialSeed: seed,
    reseed,
    advance: (ms) => {
      const advance = manual().advance;
      if (!advance)
        throw new Error('advanceClock needs a clock with advance(); use createManualClock');
      advance.call(baseClock(), ms);
    },
  });

  return { fetch: fetchImpl, handle, admin, db, chaos, now, ready, flush: () => writes };
}
