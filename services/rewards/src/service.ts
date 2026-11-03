import type {
  Cashback,
  Coupon,
  CouponId,
  Paise,
  Referral,
  ScratchCard,
  ScratchCardId,
  UserId,
} from '@pp/contracts-domain';
import type { AppEventMap } from '@pp/contracts-events';
import type { EventBus } from '@pp/core-event-bus';
import { sum } from '@pp/core-money';
import type { HttpClient } from '@pp/core-net';
import type { JsonStore } from '@pp/core-storage';
import { getClock, type Clock } from '@pp/core-time';
import { cachedFetch, type Cached } from './cache';
import { evaluateCoupon, rankCoupons, type CouponEvaluation, type RankedCoupon } from './coupons';
import { createIntentRunner } from './intent';

export interface RewardsDeps {
  http: HttpClient;
  /** Must be scoped to `userId`. */
  storage: JsonStore;
  bus: EventBus<AppEventMap>;
  userId: UserId;
  clock?: Clock;
}

export interface RewardsService {
  coupons(): Promise<Cached<Coupon[]>>;
  /** Eligible coupons for a purchase, best first. */
  applicable(spend: Paise): Promise<RankedCoupon[]>;
  evaluate(coupon: Coupon, spend: Paise): CouponEvaluation;
  redeem(id: CouponId): Promise<Coupon>;
  cashback(): Promise<Cached<Cashback[]>>;
  cashbackTotal(): Promise<Paise>;
  scratchCards(): Promise<Cached<ScratchCard[]>>;
  /** Scratching twice, or from two places at once, credits once. */
  scratch(id: ScratchCardId): Promise<ScratchCard>;
  referral(): Promise<Cached<Referral>>;
}

export function createRewardsService(deps: RewardsDeps): RewardsService {
  const { http, storage, bus } = deps;
  const now = (): number => (deps.clock ?? getClock()).now();
  const intents = createIntentRunner(storage, 'rewards');

  const coupons = () =>
    cachedFetch(storage, 'coupons', async () => (await http.call('rewards.coupons')).items);

  return {
    coupons,
    async applicable(spend) {
      const { data } = await coupons();
      return rankCoupons(data, spend, now());
    },
    evaluate: (coupon, spend) => evaluateCoupon(coupon, spend, now()),
    async redeem(id) {
      const { coupon } = await http.call('rewards.redeemCoupon', { params: { id } });
      return coupon;
    },
    cashback: () =>
      cachedFetch(storage, 'cashback', async () => (await http.call('rewards.cashback')).items),
    async cashbackTotal() {
      const { data } = await cachedFetch(
        storage,
        'cashback',
        async () => (await http.call('rewards.cashback')).items,
      );
      return sum(data.filter((c) => c.status === 'credited').map((c) => c.amount));
    },
    scratchCards: () =>
      cachedFetch(
        storage,
        'scratch-cards',
        async () => (await http.call('rewards.scratchCards')).items,
      ),
    scratch(id) {
      return intents.run(`scratch:${id}`, async (key) => {
        const { card } = await http.call('rewards.scratch', {
          params: { id },
          idempotencyKey: key,
        });
        if (card.reward !== undefined) {
          bus.emit('reward.earned', { amount: card.reward, kind: 'scratch' });
        }
        return card;
      });
    },
    referral: () =>
      cachedFetch(storage, 'referral', async () => (await http.call('rewards.referral')).referral),
  };
}
