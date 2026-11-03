import { asyncStorageBackend } from './async-backend';
import type { Entry, JsonStore, KeyValueStore } from './types';

type BackendSource = KeyValueStore | (() => KeyValueStore);

const resolve = (source: BackendSource): KeyValueStore =>
  typeof source === 'function' ? source() : source;

export function withJson(store: KeyValueStore): JsonStore {
  return {
    ...store,
    getJSON: async <T>(key: string, parse?: (raw: unknown) => T) => {
      const raw = await store.getItem(key);
      if (raw === null) return null;
      try {
        const value: unknown = JSON.parse(raw);
        return parse ? parse(value) : (value as T);
      } catch {
        return null;
      }
    },
    setJSON: (key, value) => store.setItem(key, JSON.stringify(value)),
  };
}

/** A view of `store` where every key is transparently prefixed. */
export function withPrefix(store: BackendSource, prefix: string): JsonStore {
  const full = (key: string): string => `${prefix}${key}`;
  const strip = (key: string): string => key.slice(prefix.length);
  const inner = (): KeyValueStore => resolve(store);

  return withJson({
    getItem: (key) => inner().getItem(full(key)),
    setItem: (key, value) => inner().setItem(full(key), value),
    removeItem: (key) => inner().removeItem(full(key)),
    multiGet: async (keys): Promise<Entry[]> => {
      const entries = await inner().multiGet(keys.map(full));
      return entries.map(([key, value]): Entry => [strip(key), value]);
    },
    keys: async (match = '') => (await inner().keys(full(match))).map(strip),
    clear: (match = '') => inner().clear(full(match)),
  });
}

export interface StorageOptions {
  namespace: string;
  backend?: BackendSource;
}

export function createStorage({ namespace, backend }: StorageOptions): JsonStore {
  if (namespace.length === 0) throw new Error('storage namespace must not be empty');
  return withPrefix(backend ?? asyncStorageBackend, `${namespace}:`);
}
