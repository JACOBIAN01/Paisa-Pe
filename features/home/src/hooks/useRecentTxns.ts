import { useEffect, useState } from 'react';
import type { Txn } from '@pp/contracts-domain';
import { useService } from '@pp/core-di';
import { SYNC_SERVICE } from '@pp/svc-sync';

export function useRecentTxns(limit: number): Txn[] {
  const sync = useService(SYNC_SERVICE);
  const [txns, setTxns] = useState<Txn[]>(() => sync.getTxns().slice(0, limit));
  useEffect(() => {
    const read = (): void => setTxns(sync.getTxns().slice(0, limit));
    read();
    return sync.subscribe(read);
  }, [sync, limit]);
  return txns;
}
