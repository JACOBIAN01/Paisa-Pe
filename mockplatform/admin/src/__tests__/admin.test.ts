import { createManualClock, createMockServer } from '@pp/mock-server';

const T0 = Date.UTC(2025, 5, 1, 6, 0, 0);
const make = () => {
  const clock = createManualClock(T0);
  return { clock, server: createMockServer({ clock, seed: 5 }) };
};

describe('admin controls', () => {
  it('logs in without an OTP and rejects unknown users', () => {
    const { server } = make();
    const session = server.admin.loginAs('usr_003', { name: 'Test', platform: 'ios' });
    expect(session.userId).toBe('usr_003');
    expect(
      server.handle({
        method: 'GET',
        path: '/profile',
        query: {},
        headers: { authorization: `Bearer ${session.accessToken}` },
      }).status,
    ).toBe(200);
    expect(() => server.admin.loginAs('usr_999')).toThrow('unknown user');
  });

  it('credits a wallet and bumps its version', () => {
    const { server } = make();
    const before = server.admin.getBalance('usr_002');
    const txn = server.admin.credit('usr_002', 12_345);
    const after = server.admin.getBalance('usr_002');
    expect(after).toEqual({ balance: before.balance + 12_345, version: before.version + 1 });
    expect(txn).not.toHaveProperty('ownerId');
    expect(txn).toMatchObject({ type: 'add_money', amount: 12_345, balanceAfter: after.balance });
  });

  it('simulates an incoming payment with a notification', () => {
    const { server } = make();
    const before = server.admin.getBalance('usr_001');
    const txn = server.admin.receivePayment('usr_001', 'usr_002', 50_000, 'Lunch');
    expect(txn).toMatchObject({
      type: 'p2p_receive',
      note: 'Lunch',
      counterparty: { name: 'Diya Patel' },
    });
    expect(server.admin.getBalance('usr_001').balance).toBe(before.balance + 50_000);
    const latest = server.db.t.notifications.filter((n) => n.ownerId === 'usr_001').at(-1)!;
    expect(latest.notification.route?.params?.id).toBe(txn.id);
  });

  it('lists transactions without internals and counts keyed transfers', () => {
    const { server } = make();
    const list = server.admin.listTxns('usr_001');
    expect(list).toHaveLength(300);
    expect(list[0]).not.toHaveProperty('ownerId');
    expect(server.admin.countTransfersWithKey('usr_001', 'nope')).toBe(0);
  });

  it('inspects tables as plain data', () => {
    const { server } = make();
    const users = server.admin.inspect('users') as { __map: unknown[] };
    expect(users.__map).toHaveLength(8);
    expect(server.admin.inspect('billers')).toHaveLength(12);
  });

  it('moves server time with skew and clock advances', () => {
    const { server, clock } = make();
    server.admin.setClockSkew(5000);
    expect(server.now()).toBe(T0 + 5000);
    server.admin.advanceClock(1000);
    expect(clock.now()).toBe(T0 + 1000);
    expect(server.now()).toBe(T0 + 6000);
  });

  it('refuses to advance a clock that cannot move', () => {
    const server = createMockServer({ clock: { now: () => T0, monotonic: () => 0 }, seed: 5 });
    expect(() => server.admin.advanceClock(1)).toThrow('advance');
  });

  it('proxies chaos controls', () => {
    const { server } = make();
    server.admin.failNext(undefined, 2);
    server.admin.timeoutNext();
    server.admin.dropResponse(undefined, 1, 'hang');
    expect(server.chaos.pending()).toBe(4);
  });
});
