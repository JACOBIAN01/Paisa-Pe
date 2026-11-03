import {
  createMemoryBackend,
  createSecureStorage,
  createStorage,
  resetStorageBackend,
  setStorageBackend,
  type JsonStore,
  type KeyValueStore,
  type SecureStorage,
} from '@pp/core-storage';

export interface TestStorage {
  backend: KeyValueStore;
  /** Device-level JSON store over an in-memory backend. */
  storage: JsonStore;
  secure: SecureStorage;
  /** Raw contents of the secure store, for asserting where secrets do and do not live. */
  dumpSecure(): Record<string, string>;
  /** Raw contents of the plain store. */
  dumpPlain(): Promise<Record<string, string | null>>;
}

export function createTestStorage(namespace = 'test'): TestStorage {
  const backend = createMemoryBackend();
  const secureData = new Map<string, string>();
  const secure = createSecureStorage({
    getItemAsync: async (key) => secureData.get(key) ?? null,
    setItemAsync: async (key, value) => {
      secureData.set(key, value);
    },
    deleteItemAsync: async (key) => {
      secureData.delete(key);
    },
  });
  return {
    backend,
    storage: createStorage({ namespace, backend }),
    secure,
    dumpSecure: () => Object.fromEntries(secureData),
    dumpPlain: async () => {
      const keys = await backend.keys();
      const entries = await backend.multiGet(keys);
      return Object.fromEntries(entries);
    },
  };
}

/** Points the app-wide `appStorage` at a fresh in-memory backend. */
export function installMemoryAppStorage(): KeyValueStore {
  const backend = createMemoryBackend();
  setStorageBackend(backend);
  return backend;
}

export { resetStorageBackend };
