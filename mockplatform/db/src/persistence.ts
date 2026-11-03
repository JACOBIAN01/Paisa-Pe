import type { Database, DbSnapshot } from './database';

/** Matches the AsyncStorage surface; any async string store works. */
export interface PersistenceBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const DEFAULT_PERSISTENCE_KEY = 'paisape.mockplatform.db';

export async function saveDatabase(
  db: Database,
  backend: PersistenceBackend,
  key = DEFAULT_PERSISTENCE_KEY,
): Promise<void> {
  await backend.setItem(key, JSON.stringify(db.snapshot()));
}

/** Returns true when a stored snapshot was found and restored. */
export async function loadDatabase(
  db: Database,
  backend: PersistenceBackend,
  key = DEFAULT_PERSISTENCE_KEY,
): Promise<boolean> {
  const raw = await backend.getItem(key);
  if (raw === null) return false;
  db.restore(JSON.parse(raw) as DbSnapshot);
  return true;
}

export const clearDatabase = (backend: PersistenceBackend, key = DEFAULT_PERSISTENCE_KEY) =>
  backend.removeItem(key);

export function createMemoryBackend(): PersistenceBackend {
  const store = new Map<string, string>();
  return {
    getItem: async (key) => store.get(key) ?? null,
    setItem: async (key, value) => {
      store.set(key, value);
    },
    removeItem: async (key) => {
      store.delete(key);
    },
  };
}
