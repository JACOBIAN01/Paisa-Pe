import type { GoalId, Paise } from '@pp/contracts-domain';
import { keys, useQuery } from '@pp/core-query';
import { useDebouncedValue } from '@pp/design-system';
import { PREVIEW_DEBOUNCE_MS } from '../state/goal-form';
import type { GoalsService } from '@pp/svc-goals';

export function useInterestPreview(
  goals: GoalsService,
  userId: string,
  goalId: GoalId,
  amount: Paise | null,
  months: number,
) {
  const settled = useDebouncedValue(amount, PREVIEW_DEBOUNCE_MS);
  return useQuery({
    key: [...keys.goals(userId), 'preview', goalId, settled ?? 0, months],
    fn: () => goals.preview(goalId, settled as Paise, months),
    enabled: settled !== null && settled > 0,
    staleMs: 30_000,
  });
}
