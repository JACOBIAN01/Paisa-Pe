import { useService } from '@pp/core-di';
import { keys, useQuery } from '@pp/core-query';
import { useAuthState } from '@pp/svc-auth';
import { BILLS_SERVICE } from '@pp/svc-bills';

export function useBills() {
  const bills = useService(BILLS_SERVICE);
  const { activeUserId } = useAuthState();
  const userId = activeUserId ?? '';
  const enabled = activeUserId !== null;
  const billers = useQuery({ key: keys.billers(userId), fn: () => bills.billers(), enabled });
  const dues = useQuery({ key: keys.dues(userId), fn: () => bills.dues(), enabled });
  return { userId, bills, billers, dues };
}
