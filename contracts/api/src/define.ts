import type { z, ZodTypeAny } from 'zod';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface EndpointDef {
  method: HttpMethod;
  path: string;
  auth: boolean;
  /** Mutating call that must carry an Idempotency-Key header. */
  idempotent?: boolean;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
  body?: ZodTypeAny;
  response: ZodTypeAny;
}

export const defineEndpoint = <const D extends EndpointDef>(def: D): D => def;

type Infer<S> = S extends ZodTypeAny ? z.infer<S> : undefined;
export type EndpointParams<E extends EndpointDef> = Infer<E['params']>;
export type EndpointQuery<E extends EndpointDef> = Infer<E['query']>;
export type EndpointBody<E extends EndpointDef> = Infer<E['body']>;
export type EndpointResponse<E extends EndpointDef> = z.infer<E['response']>;

export const IDEMPOTENCY_HEADER = 'Idempotency-Key';
export const IDEMPOTENCY_TTL_MS = 30_000;
