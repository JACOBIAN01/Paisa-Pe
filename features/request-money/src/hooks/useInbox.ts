import { useCallback, useEffect, useState } from 'react';
import type { MoneyRequest } from '@pp/contracts-domain';
import { useService } from '@pp/core-di';
import { REQUESTS_SERVICE } from '@pp/svc-requests';

export type InboxStatus = 'loading' | 'ready' | 'error';

export interface InboxView {
  incoming: MoneyRequest[];
  outgoing: MoneyRequest[];
  status: InboxStatus;
  refresh: () => Promise<void>;
}

/** Live view of the request inbox. Rows are identified by request id, never by position. */
export function useInbox(): InboxView {
  const requests = useService(REQUESTS_SERVICE);
  const [lists, setLists] = useState(() => ({
    incoming: requests.incoming(),
    outgoing: requests.outgoing(),
  }));
  const [status, setStatus] = useState<InboxStatus>('loading');

  useEffect(
    () =>
      requests.subscribe(() =>
        setLists({ incoming: requests.incoming(), outgoing: requests.outgoing() }),
      ),
    [requests],
  );

  const refresh = useCallback(async () => {
    try {
      await requests.refresh();
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [requests]);

  useEffect(() => {
    let live = true;
    requests
      .refresh()
      .then(() => live && setStatus('ready'))
      .catch(() => live && setStatus('error'));
    return () => {
      live = false;
    };
  }, [requests]);

  return { ...lists, status, refresh };
}
