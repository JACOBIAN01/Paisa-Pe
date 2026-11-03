export type Entry = readonly [key: string, value: string | null];

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiGet(keys: readonly string[]): Promise<Entry[]>;
  /** Keys starting with `prefix` (all keys when omitted). */
  keys(prefix?: string): Promise<string[]>;
  /** Removes keys starting with `prefix` (everything when omitted). */
  clear(prefix?: string): Promise<void>;
}

export interface JsonStore extends KeyValueStore {
  /** Returns null when the key is missing or holds unparseable JSON. */
  getJSON<T = unknown>(key: string, parse?: (raw: unknown) => T): Promise<T | null>;
  setJSON(key: string, value: unknown): Promise<void>;
}
