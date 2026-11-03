import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import type { Goal, Paise } from '@pp/contracts-domain';
import { appAnalytics } from '@pp/core-analytics';
import { t } from '@pp/core-i18n';
import {
  AmountInput,
  Button,
  EmptyState,
  ErrorBanner,
  Input,
  Screen,
  Sheet,
  Skeleton,
  Stack,
  Text,
  useDisclosure,
  useToast,
} from '@pp/design-system';
import { GoalCard } from '../components/GoalCard';
import { useGoals } from '../hooks/useGoals';
import { useIntentId } from '../hooks/useIntentId';
import { describeError } from '../state/errors';
import { GOAL_EMOJIS, isValidGoalName } from '../state/goal-form';

export function GoalsScreen() {
  const router = useRouter();
  const toast = useToast();
  const sheet = useDisclosure();
  const intent = useIntentId();
  const { goals, list } = useGoals();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string>(GOAL_EMOJIS[0]);
  const [targetText, setTargetText] = useState('');
  const [target, setTarget] = useState<Paise | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    appAnalytics.trackEvent({ name: 'screen_viewed', props: { route: 'goals' } });
  }, []);

  const canSave = isValidGoalName(name) && target !== null && !saving;

  const create = async () => {
    if (!canSave || target === null) return;
    setSaving(true);
    try {
      await goals.create({ name: name.trim(), emoji, target }, { intentId: intent.current() });
      appAnalytics.trackEvent({ name: 'goal_created', props: { hasDeadline: false } });
      intent.renew();
      toast.show(t('goals.created'), 'success');
      setName('');
      setTargetText('');
      setTarget(null);
      sheet.close();
      await list.refetch();
    } catch (error) {
      toast.show(describeError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const open = (goal: Goal) => router.push({ pathname: '/goal-detail', params: { id: goal.id } });
  const items = list.data ?? [];
  const loading = list.data === undefined && list.status !== 'error';

  return (
    <Screen scroll>
      <Stack direction="row" justify="space-between" align="center">
        <Text variant="title" accessibilityRole="header">
          {t('goals.title')}
        </Text>
        <Button title={t('goals.create')} testID="new-goal" onPress={sheet.open} />
      </Stack>
      {list.status === 'error' && list.data === undefined ? (
        <ErrorBanner message={t('goals.loadError')} onRetry={list.refetch} />
      ) : null}
      {loading ? <Skeleton height={110} /> : null}
      {list.data !== undefined && items.length === 0 ? (
        <EmptyState
          title={t('goals.empty')}
          actionLabel={t('goals.create')}
          onAction={sheet.open}
        />
      ) : null}
      <Stack gap="md">
        {items.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onPress={open} />
        ))}
      </Stack>

      <Sheet visible={sheet.isOpen} onClose={sheet.close} title={t('goals.create')}>
        <Stack gap="md">
          <Input label={t('goals.name')} value={name} onChangeText={setName} maxLength={40} />
          <Stack direction="row" gap="sm">
            {GOAL_EMOJIS.map((option) => (
              <Button
                key={option}
                title={option}
                variant={option === emoji ? 'primary' : 'ghost'}
                onPress={() => setEmoji(option)}
              />
            ))}
          </Stack>
          <AmountInput
            label={t('goals.target')}
            value={targetText}
            onChangeValue={(raw, amount) => {
              setTargetText(raw);
              setTarget(amount);
            }}
          />
          <Button
            title={t('common.save')}
            testID="save-goal"
            disabled={!canSave}
            loading={saving}
            onPress={create}
          />
        </Stack>
      </Sheet>
    </Screen>
  );
}
