import type { ScratchCard } from '@pp/contracts-domain';
import { paise } from '@pp/core-money';
import { createRewardsService } from '../service';
import { createEnv } from './helpers';

function setup() {
  const env = createEnv('usr_001');
  return { env, service: createRewardsService(env) };
}

describe('rewards service', () => {
  it('lists coupons, ranks them for a purchase and redeems one', async () => {
    const { service } = setup();
    const { data, stale } = await service.coupons();
    expect(stale).toBe(false);
    expect(data.length).toBeGreaterThan(0);

    const ranked = await service.applicable(paise(500_000));
    expect(ranked.length).toBeGreaterThan(0);
    const best = ranked[0]!;
    const redeemed = await service.redeem(best.coupon.id);
    expect(redeemed.status).toBe('redeemed');
    await expect(service.redeem(best.coupon.id)).rejects.toMatchObject({ code: 'conflict' });
  });

  it('serves the saved copy only when the network fails', async () => {
    const { env, service } = setup();
    const fresh = await service.coupons();
    env.server.chaos.dropResponse();
    const offline = await service.coupons();
    expect(offline.stale).toBe(true);
    expect(offline.data).toEqual(fresh.data);
  });

  it('does not leak one user cache into another', async () => {
    const a = setup();
    await a.service.coupons();
    const other = createEnv('usr_002', a.env.server);
    const service = createRewardsService(other);
    other.server.chaos.dropResponse();
    await expect(service.coupons()).rejects.toMatchObject({ code: 'network' });
  });

  it('sums credited cashback only', async () => {
    const { service } = setup();
    const { data } = await service.cashback();
    const expected = data.filter((c) => c.status === 'credited').reduce((a, c) => a + c.amount, 0);
    expect(await service.cashbackTotal()).toBe(expected);
  });

  it('scratches a card once, credits once and emits one event', async () => {
    const { env, service } = setup();
    const { data } = await service.scratchCards();
    const card = data.find((c: ScratchCard) => c.state === 'unscratched');
    expect(card).toBeDefined();
    const events: number[] = [];
    env.bus.on('reward.earned', ({ amount }) => events.push(amount));
    const before = env.server.admin.getBalance('usr_001').balance;

    const [a, b] = await Promise.all([service.scratch(card!.id), service.scratch(card!.id)]);
    expect(a).toBe(b);
    expect(a.state).toBe('revealed');
    expect(events).toEqual([a.reward]);
    expect(env.server.admin.getBalance('usr_001').balance - before).toBe(a.reward);
    await expect(service.scratch(card!.id)).rejects.toMatchObject({ code: 'conflict' });
  });

  it('retries a scratch whose response was lost without crediting twice', async () => {
    const { env, service } = setup();
    const { data } = await service.scratchCards();
    const card = data.find((c) => c.state === 'unscratched')!;
    const before = env.server.admin.getBalance('usr_001').balance;
    env.server.chaos.dropResponse();
    await expect(service.scratch(card.id)).rejects.toBeDefined();
    const revealed = await service.scratch(card.id);
    expect(env.server.admin.getBalance('usr_001').balance - before).toBe(revealed.reward);
  });

  it('returns the referral summary', async () => {
    const { service } = setup();
    const { data } = await service.referral();
    expect(data.code.length).toBeGreaterThan(0);
  });
});
