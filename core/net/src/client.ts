import {
  endpoints,
  IDEMPOTENCY_HEADER,
  type EndpointBody,
  type EndpointDef,
  type EndpointName,
  type EndpointParams,
  type EndpointQuery,
  type EndpointResponse,
} from '@pp/contracts-api';
import type { IdempotencyKey } from '@pp/contracts-domain';
import {
  AbortedError,
  ApiRequestError,
  AppError,
  NetworkError,
  TimeoutError,
  isAppError,
  tryCatch,
  type Result,
} from '@pp/core-result';
import { after, getClock, type Clock } from '@pp/core-time';
import { linkSignal, raceAbort } from './abort';
import { backoffDelay, DEFAULT_RETRY, type RetryPolicy } from './backoff';
import { isAuthFailure, toApiError } from './errors';
import { InterceptorChain, type HttpRequest, type Interceptor } from './interceptors';
import type { FetchLike } from './types';
import { buildUrl } from './url';

const DEFAULT_TIMEOUT_MS = 15_000;

export interface HttpClientOptions {
  baseUrl: string;
  fetch: FetchLike;
  getAccessToken?: () => string | null | Promise<string | null>;
  /** Called on a 401. Resolve true when the session was refreshed and the call should be replayed. */
  onUnauthorized?: () => Promise<boolean>;
  retry?: Partial<RetryPolicy>;
  timeoutMs?: number;
  clock?: Clock;
  /** Randomness source for backoff jitter. */
  random?: () => number;
}

interface CallOptions {
  /** Required for idempotent endpoints; reuse the same key for every retry of one intent. */
  idempotencyKey?: IdempotencyKey;
  signal?: AbortSignal;
  timeoutMs?: number;
  retry?: Partial<RetryPolicy>;
}

type RawInput = CallOptions & { params?: unknown; query?: unknown; body?: unknown };

type Part = NonNullable<EndpointDef['params']>;

export type CallInput<E extends EndpointDef> = CallOptions &
  (E extends { params: Part } ? { params: EndpointParams<E> } : unknown) &
  (E extends { query: Part } ? { query?: EndpointQuery<E> } : unknown) &
  (E extends { body: Part } ? { body: EndpointBody<E> } : unknown);

type AllOptional<T> = Partial<T> extends T ? true : false;
type CallArgs<E extends EndpointDef> =
  AllOptional<CallInput<E>> extends true ? [input?: CallInput<E>] : [input: CallInput<E>];

type EndpointOf<N extends EndpointName> = (typeof endpoints)[N];

export interface HttpClient {
  call<N extends EndpointName>(
    name: N,
    ...args: CallArgs<EndpointOf<N>>
  ): Promise<EndpointResponse<EndpointOf<N>>>;
  callResult<N extends EndpointName>(
    name: N,
    ...args: CallArgs<EndpointOf<N>>
  ): Promise<Result<EndpointResponse<EndpointOf<N>>>>;
  use(interceptor: Interceptor): () => void;
}

function validate(schema: Part | undefined, value: unknown, what: string): unknown {
  if (!schema) return undefined;
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new AppError('invalid_request', `invalid ${what}`, {
    details: { issues: parsed.error.issues.map((issue) => issue.message) },
  });
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AbortedError());
    const onAbort = (): void => {
      cancel();
      reject(new AbortedError());
    };
    const cancel = after(ms, () => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    });
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

const parseJson = (text: string): { ok: true; value: unknown } | { ok: false } => {
  if (text === '') return { ok: true, value: undefined };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
};

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const chain = new InterceptorChain();
  const clock = options.clock ?? getClock();
  const random = options.random ?? Math.random;

  async function attempt(
    endpoint: EndpointDef,
    base: Omit<HttpRequest, 'headers'> & { headers: Record<string, string> },
    input: CallOptions,
  ): Promise<unknown> {
    const headers = { ...base.headers };
    if (endpoint.auth && options.getAccessToken) {
      const token = await options.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const request = await chain.applyRequest({ ...base, headers });

    const controller = new AbortController();
    const unlink = linkSignal(input.signal, controller);
    let timedOut = false;
    const timer = setTimeout(
      () => {
        timedOut = true;
        controller.abort();
      },
      input.timeoutMs ?? options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    const started = clock.monotonic();

    try {
      const response = await raceAbort(
        options.fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          signal: controller.signal,
        }),
        controller.signal,
      );
      const text = await raceAbort(response.text(), controller.signal);
      await chain.notifyResponse({
        request,
        status: response.status,
        ok: response.ok,
        durationMs: clock.monotonic() - started,
      });
      const json = parseJson(text);
      if (!response.ok) throw toApiError(response.status, json.ok ? json.value : undefined);
      if (!json.ok) {
        throw new ApiRequestError('server_error', 'Malformed response body', response.status);
      }
      const checked = endpoint.response.safeParse(json.value);
      if (!checked.success) {
        throw new ApiRequestError('server_error', 'Unexpected response shape', response.status, {
          details: { issues: checked.error.issues.map((issue) => issue.message) },
        });
      }
      return checked.data;
    } catch (error) {
      if (error instanceof ApiRequestError) throw error;
      if (input.signal?.aborted) throw new AbortedError();
      if (timedOut) throw new TimeoutError();
      if (isAppError(error) && !(error instanceof AbortedError)) throw error;
      const message = error instanceof Error ? error.message : 'Network request failed';
      throw new NetworkError(message, { cause: error });
    } finally {
      clearTimeout(timer);
      unlink();
    }
  }

  async function execute(name: EndpointName, input: RawInput) {
    const endpoint: EndpointDef = endpoints[name];
    if (input.signal?.aborted) throw new AbortedError();

    const params = validate(endpoint.params, input.params, 'path parameters');
    const query = endpoint.query ? validate(endpoint.query, input.query ?? {}, 'query') : undefined;
    const body = endpoint.body ? validate(endpoint.body, input.body, 'body') : undefined;

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (endpoint.idempotent) {
      if (!input.idempotencyKey) {
        throw new AppError('invalid_request', `${name} requires an idempotency key`);
      }
      headers[IDEMPOTENCY_HEADER] = input.idempotencyKey;
    }
    const base = {
      url: buildUrl(
        options.baseUrl,
        endpoint.path,
        params as Record<string, string> | undefined,
        query as Record<string, string> | undefined,
      ),
      method: endpoint.method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    };

    const policy: RetryPolicy = { ...DEFAULT_RETRY, ...options.retry, ...input.retry };
    const replaySafe =
      endpoint.method === 'GET' || (endpoint.idempotent === true && !!input.idempotencyKey);
    let failed = 0;
    let refreshed = false;

    for (;;) {
      try {
        return await attempt(endpoint, base, input);
      } catch (thrown) {
        const error = isAppError(thrown) ? thrown : new NetworkError(String(thrown));
        if (error instanceof AbortedError) throw error;

        if (isAuthFailure(error) && endpoint.auth && options.onUnauthorized && !refreshed) {
          refreshed = true;
          const renewed = await options.onUnauthorized().catch(() => false);
          if (input.signal?.aborted) throw new AbortedError();
          if (renewed) continue;
          throw error;
        }

        failed += 1;
        if (!replaySafe || !error.retryable || failed >= policy.maxAttempts) throw error;
        await wait(backoffDelay(failed, policy, random), input.signal);
      }
    }
  }

  const client = {
    call: (name: EndpointName, input: RawInput = {}) => execute(name, input),
    callResult: (name: EndpointName, input: RawInput = {}) => tryCatch(() => execute(name, input)),
    use: (interceptor: Interceptor) => chain.use(interceptor),
  };
  return client as unknown as HttpClient;
}
