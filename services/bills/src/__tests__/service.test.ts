import { paise } from '@pp/core-money';
import { createBillsService } from '../service';
import { createEnv } from './helpers';

function setup() {
  const env = createEnv('usr_001');
  return { env, service: createBillsService(env) };
}

describe('bills service', () => {
  it('lists billers and dues', async () => {
    const { service } = setup();
    expect((await service.billers()).length).toBeGreaterThan(0);
    expect((await service.dues()).length).toBeGreaterThan(0);
  });

  it('pays a due and the server books exactly the amount and fee the app computed', async () => {
    const { env, service } = setup();
    env.server.admin.credit('usr_001', 5_000_000);
    const due = (await service.dues())[0]!;
    const events: number[] = [];
    env.bus.on('balance.changed', ({ balance }) => events.push(balance));

    const payment = await service.pay(due);
    expect(payment.comparison).toEqual({ matches: true, amountDiff: 0, feeDiff: 0 });
    expect(payment.txn.fee).toBe(service.totalFor(due).fee);
    expect(events).toEqual([env.server.admin.getBalance('usr_001').balance]);
  });

  it('charges once when the response is lost and the intent is retried', async () => {
    const { env, service } = setup();
    env.server.admin.credit('usr_001', 5_000_000);
    const due = (await service.dues())[0]!;
    const before = env.server.admin.getBalance('usr_001').balance;
    const intentId = 'bill-1';
    env.server.chaos.dropResponse();
    await expect(service.pay(due, { intentId })).rejects.toBeDefined();
    const payment = await service.pay(due, { intentId });
    const spent = before - env.server.admin.getBalance('usr_001').balance;
    expect(spent).toBe(payment.expected.total);
  });

  it('refuses a stale bill', async () => {
    const { env, service } = setup();
    env.server.admin.credit('usr_001', 5_000_000);
    const due = (await service.dues())[0]!;
    const stale = { ...due, items: due.items.map((i) => ({ ...i, amount: paise(i.amount + 1) })) };
    await expect(service.pay(stale)).rejects.toMatchObject({ code: 'conflict' });
  });

  it('recharges a mobile biller and validates input locally', async () => {
    const { env, service } = setup();
    const countRecharges = () =>
      env.server.admin.listTxns('usr_001').filter((t) => t.type === 'recharge').length;
    const before = countRecharges();
    const mobile = (await service.billers()).find((b) => b.category === 'mobile')!;
    const txn = await service.recharge(mobile.id, ' 9800000099 ', paise(29_900));
    expect(txn.type).toBe('recharge');
    expect(txn.amount).toBe(29_900);
    await expect(service.recharge(mobile.id, '', paise(100))).rejects.toMatchObject({
      code: 'invalid_request',
    });
    await expect(service.recharge(mobile.id, '98', paise(0))).rejects.toMatchObject({
      code: 'invalid_request',
    });
    expect(countRecharges()).toBe(before + 1);
  });

  it('saves autopay settings', async () => {
    const { service } = setup();
    const due = (await service.dues())[0]!;
    const saved = await service.setAutopay({
      billerId: due.billerId,
      accountRef: due.accountRef,
      maxAmount: paise(200_000),
      enabled: true,
    });
    expect(saved.enabled).toBe(true);
  });
});
