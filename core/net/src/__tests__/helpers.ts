import type { FetchLike, RequestInitLike, ResponseLike } from '../types';

export function reply(status: number, body?: unknown): ResponseLike {
  const text = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: async () => text,
    json: async () => JSON.parse(text),
  };
}

export const apiError = (status: number, code: string, retryable = false): ResponseLike =>
  reply(status, { error: { code, message: code, retryable } });

export const balanceBody = { balance: 1000, asOf: 5, version: 2 };

export interface Call {
  url: string;
  init: RequestInitLike;
}

export type Step = (call: Call) => Promise<ResponseLike> | ResponseLike;

/** Plays `steps` in order (the last one repeats) and records every call. */
export function scriptedFetch(...steps: Step[]): { fetch: FetchLike; calls: Call[] } {
  const calls: Call[] = [];
  const fetch: FetchLike = async (url, init = {}) => {
    const call = { url, init };
    calls.push(call);
    const step = steps[Math.min(calls.length - 1, steps.length - 1)] as Step;
    return step(call);
  };
  return { fetch, calls };
}

/** A fetch step that never answers but rejects when its signal aborts. */
export const hang: Step = ({ init }) =>
  new Promise<ResponseLike>((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });

/** A fetch step that never answers and ignores its signal entirely. */
export const hangForever: Step = () => new Promise<ResponseLike>(() => undefined);

export const networkDown: Step = () => Promise.reject(new TypeError('Network request failed'));
