import type { Goal, GoalId } from '@pp/contracts-domain';
import { paise } from '@pp/core-money';
import { interestPreview } from '../interest';
import { createGoalsService } from '../service';
import { createEnv } from './helpers';

function setup() {
  const env = createEnv('usr_001');
  return { env, service: createGoalsService(env) };
}

describe('goals service', () => {
  it('lists and creates goals', async () => {
    const { service } = setup();
    const before = await service.list();
    const goal = await service.create({ name: ' Bike ', emoji: '🚲', target: paise(500_000) });
    expect(goal.name).toBe('Bike');
    expect(service.get(goal.id)).toEqual(goal);
    expect((await service.list()).length).toBe(before.length + 1);
  });

  it('rejects bad input without calling the server', async () => {
    const { service } = setup();
    await expect(
      service.create({ name: '  ', emoji: 'x', target: paise(100) }),
    ).rejects.toMatchObject({
      code: 'invalid_request',
    });
    await expect(service.deposit('g' as GoalId, paise(0))).rejects.toMatchObject({
      code: 'invalid_request',
    });
  });

  it('deposits once per intent even when the response is lost', async () => {
    const { env, service } = setup();
    const [goal] = await service.list();
    const before = env.server.admin.getBalance('usr_001').balance;
    env.server.chaos.dropResponse();
    const intentId = 'deposit-1';
    await expect(service.deposit(goal!.id, paise(10_000), { intentId })).rejects.toBeDefined();
    const updated = await service.deposit(goal!.id, paise(10_000), { intentId });
    expect(updated.saved).toBe(goal!.saved + 10_000);
    expect(before - env.server.admin.getBalance('usr_001').balance).toBe(10_000);
  });

  it('shares one flight for concurrent calls of the same intent', async () => {
    const { env, service } = setup();
    const [goal] = await service.list();
    const before = env.server.admin.getBalance('usr_001').balance;
    const [a, b] = await Promise.all([
      service.deposit(goal!.id, paise(5000), { intentId: 'i' }),
      service.deposit(goal!.id, paise(5000), { intentId: 'i' }),
    ]);
    expect(a).toBe(b);
    expect(before - env.server.admin.getBalance('usr_001').balance).toBe(5000);
  });

  it('withdraws and refuses to take out more than is saved', async () => {
    const { service } = setup();
    const [goal] = await service.list();
    const after = await service.withdraw(goal!.id, paise(1000));
    expect(after.saved).toBe(goal!.saved - 1000);
    await expect(service.withdraw(goal!.id, paise(goal!.saved + 1))).rejects.toMatchObject({
      code: 'insufficient_funds',
    });
  });

  it('emits balance.changed after a move', async () => {
    const { env, service } = setup();
    const [goal] = await service.list();
    const seen: number[] = [];
    env.bus.on('balance.changed', ({ balance }) => seen.push(balance));
    await service.deposit(goal!.id, paise(2000));
    expect(seen).toEqual([env.server.admin.getBalance('usr_001').balance]);
  });

  it('matches the server preview exactly', async () => {
    const { service } = setup();
    const [goal] = (await service.list()) as [Goal];
    for (const [amount, months] of [
      [1_000, 1],
      [1_100, 1],
      [12_345_678, 7],
      [999_999_999, 36],
    ] as const) {
      const server = await service.preview(goal.id, paise(amount), months);
      expect(server).toEqual(interestPreview(paise(amount), goal.apyBps, months));
    }
  });
});
