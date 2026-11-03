import { appStorage } from './app-storage';
import type { JsonStore } from './types';
import { withPrefix } from './storage';

const assertUserId = (userId: string): void => {
  if (userId.length === 0 || userId.includes(':')) {
    throw new Error('userId must be non-empty and must not contain ":"');
  }
};

export const userPrefix = (userId: string): string => {
  assertUserId(userId);
  return `u:${userId}:`;
};

export const scopedKey = (userId: string, key: string): string => `${userPrefix(userId)}${key}`;

/** Storage for one user's data. Never read or write per-user data outside of this. */
export const createUserStorage = (userId: string, base: JsonStore = appStorage): JsonStore =>
  withPrefix(base, userPrefix(userId));
