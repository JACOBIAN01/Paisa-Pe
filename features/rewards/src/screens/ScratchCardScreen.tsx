import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { appAnalytics } from '@pp/core-analytics';
import { keys, useQueryClient } from '@pp/core-query';
import { t } from '@pp/core-i18n';
import { formatPaise } from '@pp/core-money';
import {
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
import { ScratchProgress } from '../components/ScratchProgress';
import { useRewardsData } from '../hooks/useRewardsData';
import { describeError } from '../state/errors';

const TICK_MS = 100;
const STEP = 10;
const CAP = 90;

export function ScratchCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const client = useQueryClient();
  const { userId, rewards, scratchCards } = useRewardsData();
  const [progress, setProgress] = useState(0);
  const [scratching, setScratching] = useState(false);
  const inFlight = useRef(false);
  const reveal = useRef(new Animated.Value(0)).current;

  const card = scratchCards.data?.data.find((c) => c.id === id);
  const revealed = card?.state === 'revealed';

  useEffect(() => {
    if (!scratching) return undefined;
    const timer = setInterval(() => setProgress((p) => Math.min(p + STEP, CAP)), TICK_MS);
    return () => clearInterval(timer);
  }, [scratching]);

  useEffect(() => {
    if (!revealed) return undefined;
    const animation = Animated.timing(reveal, { toValue: 1, duration: 300, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [revealed, reveal]);

  const scratch = async () => {
    if (!card || inFlight.current || revealed) return;
    inFlight.current = true;
    setScratching(true);
    try {
      const done = await rewards.scratch(card.id);
      setProgress(100);
      appAnalytics.trackEvent({ name: 'reward_earned', props: { kind: 'scratch' } });
      client.invalidate(keys.balance(userId));
      await scratchCards.refetch();
      if (done.reward !== undefined)
        toast.show(t('rewards.youWon', { amount: formatPaise(done.reward) }), 'success');
    } catch (error) {
      setProgress(0);
      toast.show(describeError(error), 'error');
    } finally {
      setScratching(false);
      inFlight.current = false;
    }
  };

  if (scratchCards.status !== 'error' && scratchCards.data === undefined) {
    return (
      <Screen>
        <Skeleton height={180} />
      </Screen>
    );
  }
  if (scratchCards.status === 'error' && scratchCards.data === undefined) {
    return (
      <Screen>
        <ErrorBanner message={t('rewards.loadError')} onRetry={scratchCards.refetch} />
      </Screen>
    );
  }
  if (!card) {
    return (
      <Screen>
        <EmptyState title={t('rewards.cardsEmpty')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Stack gap="lg" align="center">
          {revealed && card.reward !== undefined ? (
            <Animated.View style={{ opacity: reveal }}>
              <Text variant="display" accessibilityLabel="scratch-reward">
                {formatPaise(card.reward)}
              </Text>
            </Animated.View>
          ) : (
            <>
              <Text variant="heading">{t('rewards.scratch')}</Text>
              <ScratchProgress percent={`${progress}%`} />
              <Button
                title={t('rewards.scratch')}
                testID="scratch-button"
                loading={scratching}
                onPress={scratch}
              />
            </>
          )}
        </Stack>
      </Card>
    </Screen>
  );
}
