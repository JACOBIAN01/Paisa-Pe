import * as SecureStore from 'expo-secure-store';

export interface SecureBackend {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export interface SecureStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

const VALID_KEY = /^[A-Za-z0-9._-]+$/;

const assertKey = (key: string): void => {
  if (!VALID_KEY.test(key)) throw new Error(`invalid secure storage key: ${key}`);
};

/** Secure-store keys only allow [A-Za-z0-9._-]; user ids are mapped into that set. */
export const scopedSecureKey = (userId: string, key: string): string =>
  `u.${userId.replace(/[^A-Za-z0-9._-]/g, '_')}.${key}`;

export function createSecureStorage(backend: SecureBackend): SecureStorage {
  return {
    get: async (key) => {
      assertKey(key);
      return backend.getItemAsync(key);
    },
    set: async (key, value) => {
      assertKey(key);
      await backend.setItemAsync(key, value);
    },
    remove: async (key) => {
      assertKey(key);
      await backend.deleteItemAsync(key);
    },
  };
}

/** Use for secrets only: refresh tokens, PIN hashes. */
export const secureStorage: SecureStorage = createSecureStorage({
  getItemAsync: (key) => SecureStore.getItemAsync(key),
  setItemAsync: (key, value) => SecureStore.setItemAsync(key, value),
  deleteItemAsync: (key) => SecureStore.deleteItemAsync(key),
});
