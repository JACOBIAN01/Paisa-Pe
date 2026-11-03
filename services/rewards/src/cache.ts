import { isAppError } from '@pp/core-result';
import type { JsonStore } from '@pp/core-storage';

export interface Cached<T> {
  data: T;
  /** True when the network failed and this is the last copy saved for this user. */
  stale: boolean;
}

/**
 * Network first; falls back to the user's saved copy only for transport failures.
 * `storage` must be scoped to the signed-in user.
 */
export async function cachedFetch<T>(
  storage: JsonStore,
  key: string,
  load: () => Promise<T>,
): Promise<Cached<T>> {
  try {
    const data = await load();
    await storage.setJSON(`cache:${key}`, data);
    return { data, stale: false };
  } catch (error) {
    const transport = isAppError(error) && (error.code === 'network' || error.code === 'timeout');
    const saved = transport ? await storage.getJSON<T>(`cache:${key}`) : null;
    if (saved === null) throw error;
    return { data: saved, stale: true };
  }
}
