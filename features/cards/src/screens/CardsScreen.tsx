import { useEffect } from 'react';
import { Switch } from 'react-native';
import { appAnalytics } from '@pp/core-analytics';
import { t } from '@pp/core-i18n';
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
import { CardFace } from '../components/CardFace';
import { useCardReveal } from '../hooks/useCardReveal';
import { useCards } from '../hooks/useCards';
import { groupPan } from '../state/card-format';
import { describeError } from '../state/errors';

export function CardsScreen() {
  const toast = useToast();
  const { cards, list, status, retry } = useCards();
  const card = list[0];
  const frozen = card?.status === 'frozen';
  const { reveal, secondsLeft, show, hide } = useCardReveal(cards, card?.id);

  useEffect(() => {
    appAnalytics.trackEvent({ name: 'screen_viewed', props: { route: 'cards' } });
  }, []);

  const setFrozen = async (next: boolean) => {
    if (!card) return;
    try {
      if (next) {
        hide();
        await cards.freeze(card.id);
      } else {
        await cards.unfreeze(card.id);
      }
      appAnalytics.trackEvent({ name: 'card_frozen', props: { frozen: next } });
    } catch (error) {
      toast.show(describeError(error), 'error');
    }
  };

  const revealDetails = async () => {
    if (frozen) {
      toast.show(t('error.cardFrozen'), 'error');
      return;
    }
    try {
      await show();
    } catch (error) {
      toast.show(describeError(error), 'error');
    }
  };

  if (status === 'loading' && list.length === 0) {
    return (
      <Screen>
        <Skeleton height={180} />
      </Screen>
    );
  }
  if (status === 'error' && list.length === 0) {
    return (
      <Screen>
        <ErrorBanner message={t('cards.loadError')} onRetry={retry} />
      </Screen>
    );
  }
  if (!card) {
    return (
      <Screen>
        <EmptyState title={t('cards.empty')} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text variant="title" accessibilityRole="header">
        {t('cards.title')}
      </Text>
      <CardFace card={card} pan={reveal ? groupPan(reveal.pan) : undefined} />

      <Card>
        <Stack gap="md">
          <Stack direction="row" justify="space-between" align="center">
            <Text>{frozen ? t('cards.unfreeze') : t('cards.freeze')}</Text>
            <Switch
              testID="freeze-switch"
              accessibilityLabel={t('cards.freeze')}
              value={frozen}
              onValueChange={setFrozen}
            />
          </Stack>
        </Stack>
      </Card>

      {reveal ? (
        <Card>
          <Stack gap="sm">
            <Text>
              {t('cards.cvv')}:{' '}
              <Text variant="mono" testID="card-cvv">
                {reveal.cvv}
              </Text>
            </Text>
            <Text variant="caption" color="textMuted">
              {t('cards.visibleFor', { seconds: Math.max(secondsLeft, 0) })}
            </Text>
            <Button
              title={t('cards.hide')}
              variant="secondary"
              testID="hide-details"
              onPress={hide}
            />
          </Stack>
        </Card>
      ) : (
        <Button
          title={t('cards.reveal')}
          testID="reveal-details"
          disabled={frozen}
          onPress={revealDetails}
        />
      )}
    </Screen>
  );
}
