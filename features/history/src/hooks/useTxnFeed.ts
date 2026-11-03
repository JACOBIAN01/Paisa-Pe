import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Txn } from '@pp/contracts-domain';
import { useService } from '@pp/core-di';
import { SYNC_SERVICE } from '@pp/svc-sync';
import { DEFAULT_FILTER, filterTxns, type TxnFilter } from '../state/filters';

export const PAGE_SIZE = 25;

export interface TxnFeed {
  items: Txn[];
  total: number;
  hasMore: boolean;
  loadMore: () => void;
  filter: TxnFilter;
  setFilter: (patch: Partial<TxnFilter>) => void;
  refreshing: boolean;
  failed: boolean;
  refresh: () => Promise<void>;
}

/** Synced transactions, newest first, with filtering, search and client-side paging. */
export function useTxnFeed(): TxnFeed {
  const sync = useService(SYNC_SERVICE);
  const [all, setAll] = useState<Txn[]>(() => sync.getTxns());
  const [filter, setFilterState] = useState<TxnFilter>(DEFAULT_FILTER);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const read = (): void => setAll(sync.getTxns());
    read();
    return sync.subscribe(read);
  }, [sync]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await sync.syncNow();
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setRefreshing(false);
    }
  }, [sync]);

  useEffect(() => {
    // `refresh` only changes when the sync service instance does, and that is fixed
    // for the lifetime of the signed-in user; this is the initial load, not a re-run.
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => filterTxns(all, filter), [all, filter]);
  const setFilter = useCallback((patch: Partial<TxnFilter>) => {
    setFilterState((current) => ({ ...current, ...patch }));
    setVisible(PAGE_SIZE);
  }, []);
  const loadMore = useCallback(() => setVisible((n) => n + PAGE_SIZE), []);

  return {
    items: filtered.slice(0, visible),
    total: filtered.length,
    hasMore: filtered.length > visible,
    loadMore,
    filter,
    setFilter,
    refreshing,
    failed,
    refresh,
  };
}
