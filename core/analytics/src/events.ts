import type { Paise } from '@pp/contracts-domain';

export type AmountBucket = '<100' | '100-500' | '500-2000' | '2000-10000' | '10000+';

/** Rupee-range bucket. Analytics never receives exact amounts. */
export function amountBucket(amount: Paise | number): AmountBucket {
  const rupees = amount / 100;
  if (rupees < 100) return '<100';
  if (rupees < 500) return '100-500';
  if (rupees < 2000) return '500-2000';
  if (rupees < 10000) return '2000-10000';
  return '10000+';
}

type Props = Record<string, string | number | boolean>;

/** Every tracked event and the only properties it may carry. */
export interface AnalyticsEventMap {
  app_opened: { source: 'cold' | 'warm' | 'link' };
  login_succeeded: { method: 'otp' };
  lock_unlocked: { method: 'pin' | 'biometric' };
  payment_sent: { amountBucket: AmountBucket; type: string; status: string };
  payment_failed: { amountBucket: AmountBucket; code: string };
  request_created: { amountBucket: AmountBucket };
  split_created: { participants: number };
  reward_earned: { kind: 'cashback' | 'scratch' | 'referral' };
  goal_created: { hasDeadline: boolean };
  card_frozen: { frozen: boolean };
  bill_paid: { category: string };
  language_changed: { language: 'en' | 'hi' | 'bn' };
  screen_viewed: { route: string };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

export interface AnalyticsEvent<N extends AnalyticsEventName = AnalyticsEventName> {
  name: N;
  props: AnalyticsEventMap[N];
}

export const paymentSentEvent = (
  props: AnalyticsEventMap['payment_sent'],
): AnalyticsEvent<'payment_sent'> => ({ name: 'payment_sent', props });

export const paymentFailedEvent = (
  props: AnalyticsEventMap['payment_failed'],
): AnalyticsEvent<'payment_failed'> => ({ name: 'payment_failed', props });

export const screenViewedEvent = (route: string): AnalyticsEvent<'screen_viewed'> => ({
  name: 'screen_viewed',
  props: { route },
});

export type { Props as AnalyticsProps };
