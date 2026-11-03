import { asyncStorageBackend } from './async-backend';
import { createStorage } from './storage';
import type { KeyValueStore } from './types';

let backend: KeyValueStore = asyncStorageBackend;

export const setStorageBackend = (next: KeyValueStore): void => {
  backend = next;
};

export const resetStorageBackend = (): void => {
  backend = asyncStorageBackend;
};

export const appStorage = createStorage({ namespace: 'pp', backend: () => backend });
