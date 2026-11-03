import type { IdempotencyKey } from '@pp/contracts-domain';
import { ApiRequestError } from '@pp/core-result';
import { createIdempotencyKey } from '@pp/core-net';
import type { JsonStore } from '@pp/core-storage';

export const createIntentId = (): string => createIdempotencyKey();

export interface IntentRunner {
  /**
   * Runs one user intent. Every call with the same `intentId` shares one idempotency key
   * (also across app restarts) and concurrent calls share one in-flight promise.
   */
  run<T>(intentId: string, send: (key: IdempotencyKey) => Promise<T>): Promise<T>;
}

export function createIntentRunner(storage: JsonStore, namespace: string): IntentRunner {
  const inflight = new Map<string, Promise<unknown>>();
  const storageKey = (intentId: string): string => `${namespace}:intent:${intentId}`;

  async function keyFor(intentId: string): Promise<IdempotencyKey> {
    const saved = await storage.getJSON<string>(storageKey(intentId));
    if (typeof saved === 'string' && saved.length > 0) return saved as IdempotencyKey;
    const key = createIdempotencyKey();
    await storage.setJSON(storageKey(intentId), key);
    return key;
  }

  const isDecided = (error: unknown): boolean =>
    error instanceof ApiRequestError && !error.retryable;

  return {
    run<T>(intentId: string, send: (key: IdempotencyKey) => Promise<T>): Promise<T> {
      const existing = inflight.get(intentId);
      if (existing) return existing as Promise<T>;
      const attempt = (async (): Promise<T> => {
        const key = await keyFor(intentId);
        try {
          const result = await send(key);
          await storage.removeItem(storageKey(intentId));
          return result;
        } catch (error) {
          if (isDecided(error)) await storage.removeItem(storageKey(intentId));
          throw error;
        }
      })();
      inflight.set(intentId, attempt);
      const clear = (): void => {
        inflight.delete(intentId);
      };
      attempt.then(clear, clear);
      return attempt;
    },
  };
}
