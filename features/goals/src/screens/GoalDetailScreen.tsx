import { useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import type { GoalId, Paise } from '@pp/contracts-domain';
import { t } from '@pp/core-i18n';
import { keys, useQueryClient } from '@pp/core-query';
import { formatPaise } from '@pp/core-money';
import {
  AmountInput,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Screen,
  Skeleton,
  Stack,
  Text,
  useToast,
} from '@pp/design-system';
import { goalProgress, monthlyNeeded } from '@pp/svc-goals';
import { GoalProgressBar } from '../components/GoalProgressBar';
import { useGoals } from '../hooks/useGoals';
import { useIntentId } from '../hooks/useIntentId';
import { useInterestPreview } from '../hooks/useInterestPreview';
import { describeError } from '../state/errors';
import { moveSignature, PREVIEW_MONTHS, type MoveKind } from '../state/goal-form';
import { useNow } from '../hooks/useNow';

export function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const client = useQueryClient();
  const intent = useIntentId();
  const lastSignature = useRef('');
  const { userId, goals, list } = useGoals();
  const [kind, setKind] = useState<MoveKind>('deposit');
  const [amountText, setAmountText] = useState('');
  const [amount, setAmount] = useState<Paise | null>(null);
  const [months, setMonths] = useState<number>(PREVIEW_MONTHS[1]);
  const [busy, setBusy] = useState(false);
  const now = useNow();

  const goal = list.data?.find((g) => g.id === id);
  const preview = useInterestPreview(goals, userId, (id ?? '') as GoalId, amount, months);

  const submit = async () => {
    if (!goal || amount === null || busy) return;
    const signature = moveSignature(kind, amount);
    if (signature !== lastSignature.current) {
      intent.renew();
      lastSignature.current = signature;
    }
    setBusy(true);
    try {
      const options = { intentId: intent.current() };
      if (kind === 'deposit') await goals.deposit(goal.id, amount, options);
      else await goals.withdraw(goal.id, amount, options);
      toast.show(kind === 'deposit' ? t('goals.deposited') : t('goals.withdrawn'), 'success');
      intent.renew();
      lastSignature.current = '';
      setAmountText('');
      setAmount(null);
      client.invalidate(keys.balance(userId));
      await list.refetch();
    } catch (error) {
      toast.show(describeError(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (list.data === undefined && list.status !== 'error') {
    return (
      <Screen>
        <Skeleton height={140} />
      </Screen>
    );
  }
  if (list.data === undefined) {
    return (
      <Screen>
        <ErrorBanner message={t('goals.loadError')} onRetry={list.refetch} />
      </Screen>
    );
  }
  if (!goal) {
    return (
      <Screen>
        <EmptyState title={t('goals.empty')} />
      </Screen>
    );
  }

  const progress = goalProgress(goal);
  const monthly = monthlyNeeded(goal, now);

  return (
    <Screen scroll>
      <Text variant="title" accessibilityRole="header">
        {goal.emoji} {goal.name}
      </Text>
      <Card>
        <Stack gap="sm">
          <Text variant="display" accessibilityLabel="goal-saved">
            {formatPaise(goal.saved)}
          </Text>
          <GoalProgressBar bps={progress.progressBps} />
          <Text color="textMuted">
            {t('goals.target')} {formatPaise(goal.target)}
          </Text>
          {monthly !== null && !progress.reached ? (
            <Text variant="caption" color="textMuted">
              {t('goals.monthlyNeeded', { amount: formatPaise(monthly) })}
            </Text>
          ) : null}
        </Stack>
      </Card>

      <Stack direction="row" gap="sm">
        <Button
          title={t('goals.deposit')}
          variant={kind === 'deposit' ? 'primary' : 'ghost'}
          testID="mode-deposit"
          onPress={() => setKind('deposit')}
        />
        <Button
          title={t('goals.withdraw')}
          variant={kind === 'withdraw' ? 'primary' : 'ghost'}
          testID="mode-withdraw"
          onPress={() => setKind('withdraw')}
        />
      </Stack>
      <AmountInput
        label={t('goals.amount')}
        value={amountText}
        onChangeValue={(raw, parsed) => {
          setAmountText(raw);
          setAmount(parsed);
        }}
      />

      {kind === 'deposit' ? (
        <Stack gap="sm">
          <Stack direction="row" gap="sm">
            {PREVIEW_MONTHS.map((option) => (
              <Button
                key={option}
                title={`${option} ${t('goals.months')}`}
                variant={option === months ? 'secondary' : 'ghost'}
                onPress={() => setMonths(option)}
              />
            ))}
          </Stack>
          {preview.data ? (
            <Text accessibilityLabel="interest-preview">
              {t('goals.interest')}: {formatPaise(preview.data.interest)} · {t('goals.maturity')}:{' '}
              {formatPaise(preview.data.maturity)}
            </Text>
          ) : null}
        </Stack>
      ) : null}

      <Button
        title={kind === 'deposit' ? t('goals.deposit') : t('goals.withdraw')}
        testID="submit-move"
        disabled={amount === null || amount <= 0}
        loading={busy}
        onPress={submit}
      />
    </Screen>
  );
}
