import { useCallback, useEffect, useState } from 'react';
import { Share } from 'react-native';
import { useRouter } from 'expo-router';
import type { Coupon, Paise } from '@pp/contracts-domain';
import { appAnalytics } from '@pp/core-analytics';
import { formatDate, getLanguage, t } from '@pp/core-i18n';
import { formatPaise, parseAmount } from '@pp/core-money';
import {
  AmountInput,
  Button,
  EmptyState,
  ErrorBanner,
  ListRow,
  Screen,
  SectionHeader,
  Skeleton,
  Stack,
  Text,
  useToast,
} from '@pp/design-system';
import { CouponCard } from '../components/CouponCard';
import { useRewardsData } from '../hooks/useRewardsData';
import { couponCanBeRedeemed, DEFAULT_SPEND_TEXT, describeCoupon } from '../state/coupon-view';
import { describeError } from '../state/errors';

export function RewardsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { rewards, coupons, cashback, scratchCards, referral } = useRewardsData();
  const [spendText, setSpendText] = useState(DEFAULT_SPEND_TEXT);
  const [spend, setSpend] = useState<Paise | null>(parseAmount(DEFAULT_SPEND_TEXT));
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => {
    appAnalytics.trackEvent({ name: 'screen_viewed', props: { route: 'rewards' } });
  }, []);

  const redeem = useCallback(
    async (coupon: Coupon) => {
      setRedeeming(coupon.id);
      try {
        await rewards.redeem(coupon.id);
        toast.show(t('rewards.redeemedLabel'), 'success');
        await coupons.refetch();
      } catch (error) {
        toast.show(describeError(error), 'error');
      } finally {
        setRedeeming(null);
      }
    },
    [rewards, toast, coupons],
  );

  const failed = coupons.status === 'error' && coupons.data === undefined;
  const couponList = coupons.data?.data ?? [];
  const cashbackList = cashback.data?.data ?? [];
  const cardList = scratchCards.data?.data ?? [];
  const stale = [coupons, cashback, scratchCards, referral].some((q) => q.data?.stale === true);
  const cashbackTotal = cashbackList.reduce((acc, item) => acc + item.amount, 0) as Paise;

  const shareCode = (code: string) => {
    Share.share({ message: t('rewards.inviteCode', { code }) }).catch(() => undefined);
  };

  return (
    <Screen scroll>
      <Text variant="title" accessibilityRole="header">
        {t('rewards.title')}
      </Text>
      {stale ? (
        <Text variant="caption" color="warning">
          {t('rewards.savedOffers')}
        </Text>
      ) : null}
      {failed ? <ErrorBanner message={t('rewards.loadError')} onRetry={coupons.refetch} /> : null}

      <SectionHeader title={t('rewards.coupons')} />
      <AmountInput
        label={t('rewards.spendLabel')}
        value={spendText}
        onChangeValue={(raw, amount) => {
          setSpendText(raw);
          setSpend(amount);
        }}
      />
      {coupons.status !== 'error' && coupons.data === undefined ? <Skeleton height={96} /> : null}
      {coupons.data !== undefined && couponList.length === 0 ? (
        <EmptyState title={t('rewards.empty')} />
      ) : null}
      <Stack gap="md">
        {couponList.map((coupon) => {
          const view = describeCoupon(rewards.evaluate(coupon, spend ?? (0 as Paise)));
          return (
            <CouponCard
              key={coupon.id}
              coupon={coupon}
              view={view}
              canRedeem={couponCanBeRedeemed(coupon, view)}
              busy={redeeming === coupon.id}
              onRedeem={redeem}
            />
          );
        })}
      </Stack>

      <SectionHeader title={t('rewards.cashback')} />
      {cashback.data !== undefined && cashbackList.length === 0 ? (
        <Text color="textMuted">{t('rewards.cashbackEmpty')}</Text>
      ) : (
        <Text accessibilityLabel="cashback-total">
          {t('rewards.cashbackTotal', { amount: formatPaise(cashbackTotal) })}
        </Text>
      )}
      {cashbackList.slice(0, 5).map((item) => (
        <ListRow
          key={item.txnId}
          title={formatPaise(item.amount)}
          subtitle={formatDate(item.createdAt, getLanguage())}
          right={<Text variant="caption">{item.status}</Text>}
        />
      ))}

      <SectionHeader title={t('rewards.scratchCards')} />
      {scratchCards.data !== undefined && cardList.length === 0 ? (
        <Text color="textMuted">{t('rewards.cardsEmpty')}</Text>
      ) : null}
      {cardList.map((card) => (
        <ListRow
          key={card.id}
          testID={`scratch-${card.id}`}
          title={card.state === 'revealed' ? t('rewards.revealed') : t('rewards.scratch')}
          subtitle={
            card.reward === undefined
              ? t('rewards.expires', { date: formatDate(card.expiresAt, getLanguage()) })
              : t('rewards.youWon', { amount: formatPaise(card.reward) })
          }
          onPress={() => router.push({ pathname: '/scratch-card', params: { id: card.id } })}
        />
      ))}

      <SectionHeader title={t('rewards.referral')} />
      {referral.data !== undefined ? (
        <Stack gap="sm">
          <Text variant="mono" accessibilityLabel="referral-code">
            {referral.data.data.code}
          </Text>
          <Text color="textMuted">
            {t('rewards.invited', { count: referral.data.data.invited })}
          </Text>
          <Button
            title={t('common.share')}
            variant="secondary"
            onPress={() => shareCode(referral.data?.data.code ?? '')}
          />
        </Stack>
      ) : null}
    </Screen>
  );
}
