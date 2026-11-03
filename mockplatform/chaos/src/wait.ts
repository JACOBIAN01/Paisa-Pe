import { after } from '@pp/core-time';

export function abortError(): Error {
  const error = new Error('The operation was aborted');
  error.name = 'AbortError';
  return error;
}

/** Resolves after `ms`, or rejects with an AbortError as soon as `signal` fires. */
export function wait(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(abortError());
  if (ms <= 0) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const onAbort = (): void => {
      cancel();
      reject(abortError());
    };
    const cancel = after(ms, () => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    });
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Never resolves on its own; only an abort ends it. */
export function hang(signal?: AbortSignal): Promise<never> {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise<never>((_resolve, reject) => {
    signal?.addEventListener('abort', () => reject(abortError()), { once: true });
  });
}
