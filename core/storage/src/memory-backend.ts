import type { Entry, KeyValueStore } from './types';

export function createMemoryBackend(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map<string, string>(Object.entries(initial));
  const matching = (prefix?: string): string[] =>
    [...data.keys()].filter((key) => prefix === undefined || key.startsWith(prefix));

  return {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
    multiGet: async (keys): Promise<Entry[]> => keys.map((key) => [key, data.get(key) ?? null]),
    keys: async (prefix) => matching(prefix),
    clear: async (prefix) => {
      for (const key of matching(prefix)) data.delete(key);
    },
  };
}
