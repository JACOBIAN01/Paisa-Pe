import { IDEMPOTENCY_TTL_MS } from '@pp/contracts-api';
import {
  DIYA,
  DIYA_CONTACT,
  DIYA_PHONE,
  EXTERNAL_PHONE,
  PRIMARY,
  PRIMARY_PHONE,
  login,
  setBalance,
  setup,
} from './helpers';

describe('wallet', () => {
  it('returns balance with a version', () => {
    const { server } = setup();
    const { api } = login(server);
    const res = api.get('/wallet/balance');
    expect(res.body).toMatchObject({ balance: server.admin.getBalance(PRIMARY).balance });
    expect(res.body.version).toBeGreaterThan(0);
  });

  it('adds money, enforces the wallet cap, and validates', () => {
    const { server } = setup();
    const { api } = login(server);
    setBalance(server, PRIMARY, 100_000);
    const ok = api.keyed('/wallet/add-money', { amount: 50_000, source: 'upi' }, 'k1');
    expect(ok.body.balance.balance).toBe(150_000);
    expect(ok.body.txn).toMatchObject({ type: 'add_money', amount: 50_000 });
    setBalance(server, PRIMARY, 9_900_000);
    expect(
      api.keyed('/wallet/add-money', { amount: 200_000, source: 'upi' }, 'k2').body.error.code,
    ).toBe('limit_exceeded');
    expect(api.keyed('/wallet/add-money', { amount: 10.5, source: 'upi' }, 'k3').status).toBe(400);
    expect(
      api.keyed('/wallet/add-money', { amount: 3_000_000, source: 'upi' }, 'k4').body.error.details
        .limit,
    ).toBe('perTxn');
  });

  it('pages transactions newest first without gaps or overlap', () => {
    const { server } = setup();
    const { api } = login(server);
    const seen: string[] = [];
    let cursor: string | undefined;
    for (let guard = 0; guard < 40; guard += 1) {
      const res = api.get(`/wallet/transactions?limit=40${cursor ? `&cursor=${cursor}` : ''}`);
      seen.push(...res.body.items.map((t: { id: string }) => t.id));
      cursor = res.body.nextCursor ?? undefined;
      if (!cursor) break;
    }
    expect(seen).toHaveLength(300);
    expect(new Set(seen).size).toBe(300);
    const all = server.admin.listTxns(PRIMARY);
    expect(seen[0]).toBe(all[all.length - 1]?.id);
  });

  it('fetches one transaction and hides others', () => {
    const { server } = setup();
    const { api } = login(server);
    const own = server.admin.listTxns(PRIMARY)[0]!;
    const other = server.admin.listTxns(DIYA)[0]!;
    expect(api.get(`/wallet/transactions/${own.id}`).body.txn.id).toBe(own.id);
    expect(api.get(`/wallet/transactions/${other.id}`).status).toBe(404);
    expect(api.get('/wallet/transactions?cursor=***').status).toBe(400);
  });
});

describe('transfers', () => {
  const send = (api: ReturnType<typeof login>['api'], body: object, key: string) =>
    api.keyed('/transfers', body, key);

  it('debits the sender and credits a registered recipient', () => {
    const { server } = setup();
    const { api } = login(server);
    setBalance(server, PRIMARY, 1_000_000);
    const diyaBefore = server.admin.getBalance(DIYA).balance;
    const res = send(api, { to: { phone: DIYA_PHONE }, amount: 250_000, note: 'Rent' }, 'k1');
    expect(res.status).toBe(200);
    expect(res.body.balance.balance).toBe(750_000);
    expect(res.body.txn).toMatchObject({
      type: 'p2p_send',
      amount: 250_000,
      balanceAfter: 750_000,
    });
    expect(server.admin.getBalance(DIYA).balance).toBe(diyaBefore + 250_000);
    const credit = server.admin.listTxns(DIYA).at(-1)!;
    expect(credit).toMatchObject({ type: 'p2p_receive', amount: 250_000, note: 'Rent' });
    const notices = login(server, DIYA).api.get('/notifications').body.items;
    expect(notices[0].title).toBe('Money received');
  });

  it('resolves recipients by contact id and external phone', () => {
    const { server } = setup();
    const { api } = login(server);
    setBalance(server, PRIMARY, 1_000_000);
    expect(
      send(api, { to: { contactId: DIYA_CONTACT }, amount: 10_000 }, 'a').body.txn.counterparty
        .userId,
    ).toBe(DIYA);
    const external = send(api, { to: { phone: EXTERNAL_PHONE }, amount: 10_000 }, 'b');
    expect(external.status).toBe(200);
    expect(send(api, { to: { contactId: 'ct_nope' }, amount: 100 }, 'c').status).toBe(404);
  });

  it('rejects self-sends, bad amounts and low balance', () => {
    const { server } = setup();
    const { api } = login(server);
    setBalance(server, PRIMARY, 50_000);
    expect(send(api, { to: { phone: PRIMARY_PHONE }, amount: 100 }, 'a').body.error.code).toBe(
      'invalid_request',
    );
    expect(send(api, { to: { phone: DIYA_PHONE }, amount: 0 }, 'b').status).toBe(400);
    expect(send(api, { to: { phone: DIYA_PHONE }, amount: 1.5 }, 'c').status).toBe(400);
    const low = send(api, { to: { phone: DIYA_PHONE }, amount: 60_000 }, 'd');
    expect(low.status).toBe(422);
    expect(low.body.error).toMatchObject({
      code: 'insufficient_funds',
      details: { balance: 50_000, required: 60_000 },
    });
    expect(server.admin.getBalance(PRIMARY).balance).toBe(50_000);
  });

  it('enforces tier limits and points to KYC when an upgrade would help', () => {
    const { server } = setup();
    const min = login(server, 'usr_004');
    setBalance(server, 'usr_004', 900_000);
    const over = send(min.api, { to: { phone: DIYA_PHONE }, amount: 600_000 }, 'a');
    expect(over.body.error).toMatchObject({
      code: 'kyc_required',
      details: { limit: 'perTxn', upgradeTo: 'basic' },
    });
    const { api } = login(server, 'usr_002');
    setBalance(server, 'usr_002', 50_000_000);
    const full = send(api, { to: { phone: PRIMARY_PHONE }, amount: 10_000_001 }, 'b');
    expect(full.body.error.code).toBe('limit_exceeded');
  });

  it('applies the daily limit across transfers', () => {
    const { server } = setup();
    const { api } = login(server);
    setBalance(server, PRIMARY, 8_000_000);
    const used = api.get('/limits').body.limits.daily.used;
    const room = 5_000_000 - used;
    expect(
      send(api, { to: { phone: EXTERNAL_PHONE }, amount: Math.min(2_500_000, room) }, 'a').status,
    ).toBe(200);
    const nextAmount = 2_500_000;
    const second = send(api, { to: { phone: EXTERNAL_PHONE }, amount: nextAmount }, 'b');
    const third = send(api, { to: { phone: EXTERNAL_PHONE }, amount: nextAmount }, 'c');
    expect([second.status, third.status]).toContain(403);
  });

  it('rejects when the recipient cannot hold the amount', () => {
    const { server } = setup();
    const { api } = login(server);
    setBalance(server, PRIMARY, 1_000_000);
    setBalance(server, 'usr_004', 950_000);
    const res = send(api, { to: { phone: '+919800000004' }, amount: 100_000 }, 'a');
    expect(res.body.error).toMatchObject({ code: 'limit_exceeded', details: { receiver: true } });
  });

  describe('idempotency', () => {
    const body = { to: { phone: DIYA_PHONE }, amount: 10_000 };

    it('requires a key', () => {
      const { server } = setup();
      const { api } = login(server);
      expect(api.post('/transfers', body).body.error.code).toBe('invalid_request');
    });

    it('replays the first response for a repeated key', () => {
      const { server } = setup();
      const { api } = login(server);
      setBalance(server, PRIMARY, 100_000);
      const first = send(api, body, 'same');
      const second = send(api, body, 'same');
      expect(second.headers['idempotency-replayed']).toBe('true');
      expect(second.body).toEqual(first.body);
      expect(server.admin.getBalance(PRIMARY).balance).toBe(90_000);
      expect(server.admin.countTransfersWithKey(PRIMARY, 'same')).toBe(1);
    });

    it('conflicts when the same key carries a different request', () => {
      const { server } = setup();
      const { api } = login(server);
      send(api, body, 'same');
      expect(send(api, { ...body, amount: 20_000 }, 'same').body.error.code).toBe('conflict');
    });

    it('forgets the key once the TTL has passed', () => {
      const { server, clock } = setup();
      const { api } = login(server);
      setBalance(server, PRIMARY, 100_000);
      send(api, body, 'k');
      clock.advance(IDEMPOTENCY_TTL_MS - 1);
      expect(send(api, body, 'k').headers['idempotency-replayed']).toBe('true');
      clock.advance(IDEMPOTENCY_TTL_MS);
      const again = send(api, body, 'k');
      expect(again.headers['idempotency-replayed']).toBeUndefined();
      expect(server.admin.countTransfersWithKey(PRIMARY, 'k')).toBe(2);
      expect(server.admin.getBalance(PRIMARY).balance).toBe(80_000);
    });

    it('does not store failures, so a retry can succeed', () => {
      const { server } = setup();
      const { api } = login(server);
      setBalance(server, PRIMARY, 5_000);
      expect(send(api, body, 'k').status).toBe(422);
      server.admin.credit(PRIMARY, 50_000);
      expect(send(api, body, 'k').status).toBe(200);
    });

    it('scopes keys per user', () => {
      const { server } = setup();
      const a = login(server);
      const b = login(server, DIYA);
      setBalance(server, PRIMARY, 100_000);
      setBalance(server, DIYA, 100_000);
      send(a.api, body, 'shared');
      const other = send(b.api, { to: { phone: PRIMARY_PHONE }, amount: 10_000 }, 'shared');
      expect(other.headers['idempotency-replayed']).toBeUndefined();
    });
  });

  it('never double-spends under concurrent sends', async () => {
    const { server } = setup();
    const { session } = login(server);
    setBalance(server, PRIMARY, 100_000);
    const attempt = (key: string) =>
      server.fetch('/transfers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.accessToken}`, 'Idempotency-Key': key },
        body: JSON.stringify({ to: { phone: DIYA_PHONE }, amount: 70_000 }),
      });
    const results = await Promise.all([attempt('a'), attempt('b'), attempt('c')]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 422, 422]);
    expect(server.admin.getBalance(PRIMARY).balance).toBe(30_000);
  });
});
