import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Entry, KeyValueStore } from './types';

const matching = async (prefix?: string): Promise<string[]> => {
  const all = await AsyncStorage.getAllKeys();
  return all.filter((key) => prefix === undefined || key.startsWith(prefix));
};

export const asyncStorageBackend: KeyValueStore = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
  multiGet: async (keys): Promise<Entry[]> => {
    const pairs = await AsyncStorage.multiGet([...keys]);
    return pairs.map(([key, value]): Entry => [key, value]);
  },
  keys: matching,
  clear: async (prefix) => {
    await AsyncStorage.multiRemove(await matching(prefix));
  },
};
