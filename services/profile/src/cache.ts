import type { ZodType, ZodTypeDef } from 'zod';
import { createUserStorage, type JsonStore } from '@pp/core-storage';

/** Reads and writes one user's cached documents. Every key is user-scoped. */
export interface UserCache {
  read<T>(userId: string, key: string, schema: ZodType<T, ZodTypeDef, unknown>): Promise<T | null>;
  write(userId: string, key: string, value: unknown): Promise<void>;
  clear(userId: string): Promise<void>;
}

export function createUserCache(base: JsonStore, namespace: string): UserCache {
  const scoped = (userId: string): JsonStore => createUserStorage(userId, base);
  const fullKey = (key: string): string => `${namespace}.${key}`;

  return {
    read: (userId, key, schema) => scoped(userId).getJSON(fullKey(key), (raw) => schema.parse(raw)),
    write: (userId, key, value) => scoped(userId).setJSON(fullKey(key), value),
    clear: (userId) => scoped(userId).clear(`${namespace}.`),
  };
}
