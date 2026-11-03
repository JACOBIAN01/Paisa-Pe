import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { QuerySnapshot } from './client';
import { hashKey, keyFromHash, type QueryKey } from './key';
import { useQueryClient } from './provider';

export interface UseQueryOptions<T> {
  key: QueryKey;
  fn: () => Promise<T>;
  /** How long fetched data counts as fresh. Defaults to 0 (always refetch on mount). */
  staleMs?: number;
  enabled?: boolean;
}

export interface UseQueryResult<T> extends QuerySnapshot<T> {
  refetch(): Promise<void>;
}

export function useQuery<T>({
  key,
  fn,
  staleMs = 0,
  enabled = true,
}: UseQueryOptions<T>): UseQueryResult<T> {
  const client = useQueryClient();
  const hash = hashKey(key);
  const stableKey = useMemo(() => keyFromHash(hash), [hash]);

  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  const subscribe = useCallback(
    (listener: () => void) => client.subscribe(stableKey, listener),
    [client, stableKey],
  );
  const getSnapshot = useCallback(() => client.getSnapshot<T>(stableKey), [client, stableKey]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!enabled) return;
    client.ensure(stableKey, () => fnRef.current(), { staleMs }).catch(() => undefined);
  }, [client, stableKey, enabled, staleMs]);

  const refetch = useCallback(
    () =>
      client
        .refetch(stableKey, () => fnRef.current())
        .then(
          () => undefined,
          () => undefined,
        ),
    [client, stableKey],
  );

  return { ...snapshot, refetch };
}
