import { useEffect, useState } from 'react';
import type { Txn } from '@pp/contracts-domain';
import { useService } from '@pp/core-di';
import { keys, useQuery } from '@pp/core-query';
import { HTTP_CLIENT } from '@pp/core-net';
import { SYNC_SERVICE } from '@pp/svc-sync';

export interface TxnLookup {
  txn: Txn | undefined;
  loading: boolean;
  missing: boolean;
}

/** Looks in the synced mirror first and falls back to the API for older transactions. */
export function useTxn(userId: string | null, id: string | undefined): TxnLookup {
  const sync = useService(SYNC_SERVICE);
  const http = useService(HTTP_CLIENT);
  const [local, setLocal] = useState<Txn | undefined>(() =>
    sync.getTxns().find((t) => t.id === id),
  );
  useEffect(() => {
    const read = (): void => setLocal(sync.getTxns().find((t) => t.id === id));
    read();
    return sync.subscribe(read);
  }, [sync, id]);

  const remote = useQuery({
    key: keys.transaction(userId ?? '', id ?? ''),
    fn: async () => (await http.call('wallet.transaction', { params: { id: id ?? '' } })).txn,
    enabled: userId !== null && id !== undefined && local === undefined,
  });

  const txn = local ?? remote.data;
  return {
    txn,
    loading: txn === undefined && (remote.status === 'loading' || remote.status === 'idle'),
    missing: txn === undefined && remote.status === 'error',
  };
}
