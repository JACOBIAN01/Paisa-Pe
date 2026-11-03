import { createToken } from '@pp/core-di';
import type { SecureStorage } from './secure';
import type { JsonStore } from './types';

/** Storage scoped to the signed-in user. */
export const USER_STORAGE = createToken<JsonStore>('user-storage');
export const SECURE_STORAGE = createToken<SecureStorage>('secure-storage');
