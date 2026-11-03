import { keys, useQuery } from '@pp/core-query';
import { useService } from '@pp/core-di';
import { REWARDS_SERVICE } from '@pp/svc-rewards';
import { useAuthState } from '@pp/svc-auth';

/** All rewards queries for the signed-in user; every key starts with their id. */
export function useRewardsData() {
  const rewards = useService(REWARDS_SERVICE);
  const { activeUserId } = useAuthState();
  const userId = activeUserId ?? '';
  const enabled = activeUserId !== null;

  const coupons = useQuery({ key: keys.coupons(userId), fn: () => rewards.coupons(), enabled });
  const cashback = useQuery({ key: keys.cashback(userId), fn: () => rewards.cashback(), enabled });
  const scratchCards = useQuery({
    key: keys.scratchCards(userId),
    fn: () => rewards.scratchCards(),
    enabled,
  });
  const referral = useQuery({ key: keys.referral(userId), fn: () => rewards.referral(), enabled });

  return { userId, rewards, coupons, cashback, scratchCards, referral };
}
