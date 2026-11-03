import { useCallback, useEffect, useRef, useState } from 'react';
import { useService } from '@pp/core-di';
import { every } from '@pp/core-time';
import { LEDGER } from '@pp/svc-ledger';
import { REQUESTS_SERVICE } from '@pp/svc-requests';
import { SYNC_SERVICE } from '@pp/svc-sync';

const AUTO_REFRESH_MS = 60_000;

export interface HomeRefresh {
  refreshing: boolean;
  failed: boolean;
  refresh: () => Promise<void>;
}

/** Balance, sync and request refresh for the home tab, with a slow background tick. */
export function useHomeRefresh(): HomeRefresh {
  const ledger = useService(LEDGER);
  const sync = useService(SYNC_SERVICE);
  const requests = useService(REQUESTS_SERVICE);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const results = await Promise.allSettled([
      ledger.fetchBalance(),
      sync.syncNow(),
      requests.refresh('incoming'),
    ]);
    setFailed(results.some((r) => r.status === 'rejected'));
    setRefreshing(false);
  }, [ledger, sync, requests]);

  // The timer is created once; it always calls the latest refresh through the ref.
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });
  useEffect(() => {
    const cancel = every(AUTO_REFRESH_MS, () => {
      void refreshRef.current();
    });
    return cancel;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { refreshing, failed, refresh };
}
