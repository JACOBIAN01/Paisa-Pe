import { Pressable } from 'react-native';
import type { Goal } from '@pp/contracts-domain';
import { t } from '@pp/core-i18n';
import { formatPaise } from '@pp/core-money';
import { Card, Stack, Text } from '@pp/design-system';
import { goalProgress } from '@pp/svc-goals';
import { GoalProgressBar } from './GoalProgressBar';

export interface GoalCardProps {
  goal: Goal;
  onPress: (goal: Goal) => void;
}

export function GoalCard({ goal, onPress }: GoalCardProps) {
  const progress = goalProgress(goal);
  const percentLabel = t('goals.progress', { percent: Math.floor(progress.progressBps / 100) });
  return (
    <Pressable
      testID={`goal-${goal.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${goal.name}, ${percentLabel}`}
      onPress={() => onPress(goal)}
    >
      <Card>
        <Stack gap="sm">
          <Stack direction="row" justify="space-between" align="center">
            <Text variant="heading">
              {goal.emoji} {goal.name}
            </Text>
            <Text variant="caption" color="textMuted">
              {percentLabel}
            </Text>
          </Stack>
          <GoalProgressBar bps={progress.progressBps} />
          <Text color="textMuted">
            {progress.reached
              ? t('goals.reached')
              : t('goals.remaining', { amount: formatPaise(progress.remaining) })}
          </Text>
          <Text variant="caption" color="textMuted">
            {t('goals.saved')} {formatPaise(goal.saved)} · {t('goals.target')}{' '}
            {formatPaise(goal.target)}
          </Text>
        </Stack>
      </Card>
    </Pressable>
  );
}
