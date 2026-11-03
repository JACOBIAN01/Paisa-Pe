import { useService } from '@pp/core-di';
import { keys, useQuery } from '@pp/core-query';
import { useAuthState } from '@pp/svc-auth';
import { GOALS_SERVICE } from '@pp/svc-goals';

export function useGoals() {
  const goals = useService(GOALS_SERVICE);
  const { activeUserId } = useAuthState();
  const userId = activeUserId ?? '';
  const list = useQuery({
    key: keys.goals(userId),
    fn: () => goals.list(),
    enabled: activeUserId !== null,
  });
  return { userId, goals, list };
}
