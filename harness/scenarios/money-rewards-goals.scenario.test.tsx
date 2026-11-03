import type { CouponId, GoalId, ScratchCardId } from '@pp/contracts-domain';
import { paise } from '@pp/core-money';
import { GOALS_SERVICE, interestPreview } from '@pp/svc-goals';
import { REWARDS_SERVICE } from '@pp/svc-rewards';
import { createTestApp, recordEvents, type TestApp } from '../index';
import { balanceOf, ensureBalance } from './money-support';

let app: TestApp;

beforeEach(async () => {
  app = await createTestApp();
  ensureBalance(app, 500_000);
});

afterEach(() => {
  app.dispose();
});

describe('scenario 20: rewards', () => {
  it('redeems a coupon and scratches a card once, crediting the wallet', async () => {
    const rewards = app.container.resolve(REWARDS_SERVICE);
    const events = recordEvents();

    const coupon = (await rewards.coupons()).data.find((c) => c.status === 'available');
    expect(coupon).toBeDefined();
    const redeemed = await rewards.redeem(coupon?.id as CouponId);
    expect(redeemed.status).toBe('redeemed');
    const afterRedeem = (await rewards.coupons()).data.find((c) => c.id === coupon?.id);
    expect(afterRedeem?.status).toBe('redeemed');

    const card = (await rewards.scratchCards()).data.find((c) => c.state === 'unscratched');
    expect(card).toBeDefined();
    const before = balanceOf(app);
    const revealed = await rewards.scratch(card?.id as ScratchCardId);
    expect(revealed.state).toBe('revealed');
    const reward = revealed.reward ?? 0;
    expect(balanceOf(app)).toBe(before + reward);
    expect(events.count('reward.earned')).toBe(1);

    await expect(rewards.scratch(card?.id as ScratchCardId)).rejects.toMatchObject({
      code: 'conflict',
    });
    expect(balanceOf(app)).toBe(before + reward);
    expect(events.count('reward.earned')).toBe(1);

    const other = (await rewards.scratchCards()).data.find((c) => c.state === 'unscratched');
    if (other) {
      const beforeOther = balanceOf(app);
      const [a, b] = await Promise.all([
        rewards.scratch(other.id as ScratchCardId),
        rewards.scratch(other.id as ScratchCardId),
      ]);
      expect(a.reward).toBe(b.reward);
      expect(balanceOf(app)).toBe(beforeOther + (a.reward ?? 0));
      expect(events.count('reward.earned')).toBe(2);
    }
    events.stop();
  });
});

describe('scenario 21: savings goals', () => {
  it('creates a goal, moves money into it and previews interest the way the server does', async () => {
    const goals = app.container.resolve(GOALS_SERVICE);
    const before = balanceOf(app);
    const goal = await goals.create({ name: 'Trip', emoji: '🏔️', target: paise(500_000) });
    expect(goal.saved).toBe(0);

    const updated = await goals.deposit(goal.id, paise(120_000));
    expect(updated.saved).toBe(120_000);
    expect(balanceOf(app)).toBe(before - 120_000);

    const preview = await goals.preview(goal.id as GoalId, paise(120_000), 12);
    const local = interestPreview(paise(120_000), updated.apyBps, 12);
    expect(preview.interest).toBe(local.interest);
    expect(preview.maturity).toBe(local.maturity);
    expect(preview.maturity).toBe(preview.principal + preview.interest);

    const after = await goals.withdraw(goal.id, paise(20_000));
    expect(after.saved).toBe(100_000);
    expect(balanceOf(app)).toBe(before - 100_000);
  });
});
