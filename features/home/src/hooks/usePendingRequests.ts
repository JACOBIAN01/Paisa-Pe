import { useEffect, useState } from 'react';
import { useService } from '@pp/core-di';
import { REQUESTS_SERVICE } from '@pp/svc-requests';

export function usePendingRequests(): number {
  const requests = useService(REQUESTS_SERVICE);
  const [count, setCount] = useState(() => requests.pendingIncomingCount());
  useEffect(() => {
    setCount(requests.pendingIncomingCount());
    return requests.subscribe(() => setCount(requests.pendingIncomingCount()));
  }, [requests]);
  return count;
}
