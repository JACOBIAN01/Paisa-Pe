import { PRIMARY, login, setBalance, setup } from './helpers';

describe('rewards', () => {
  it('lists coupons with computed expiry and redeems once', () => {
    const { server, clock } = setup();
    const { api } = login(server);
    const coupons = api.get('/rewards/coupons').body.items;
    expect(coupons).toHaveLength(12);
    const available = coupons.find((c: { status: string }) => c.status === 'available');
    expect(api.post(`/rewards/coupons/${available.id}/redeem`, {}).body.coupon.status).toBe(
      'redeemed',
    );
    expect(api.post(`/rewards/coupons/${available.id}/redeem`, {}).body.error.code).toBe(
      'conflict',
    );
    expect(api.post('/rewards/coupons/cp_missing/redeem', {}).status).toBe(404);
    clock.advance(90 * 86_400_000);
    const later = login(server).api.get('/rewards/coupons').body.items;
    expect(later.filter((c: { status: string }) => c.status === 'available')).toHaveLength(0);
  });

  it('scratches a card once and credits the prize', () => {
    const { server } = setup();
    const { api } = login(server);
    const card = api
      .get('/rewards/scratch-cards')
      .body.items.find((c: { state: string }) => c.state === 'unscratched');
    const before = server.admin.getBalance(PRIMARY).balance;
    const res = api.keyed(`/rewards/scratch-cards/${card.id}/scratch`, undefined, 'k');
    expect(res.body.card.state).toBe('revealed');
    expect(res.body.balance.balance).toBe(before + res.body.card.reward);
    expect(
      api.keyed(`/rewards/scratch-cards/${card.id}/scratch`, undefined, 'k').headers[
        'idempotency-replayed'
      ],
    ).toBe('true');
    expect(
      api.keyed(`/rewards/scratch-cards/${card.id}/scratch`, undefined, 'k2').body.error.code,
    ).toBe('conflict');
    expect(server.admin.getBalance(PRIMARY).balance).toBe(before + res.body.card.reward);
  });

  it('serves cashback and referral', () => {
    const { server } = setup();
    const { api } = login(server);
    expect(api.get('/rewards/cashback').body.items.length).toBeGreaterThan(0);
    expect(api.get('/rewards/referral').body.referral.code).toMatch(/^AARAV/);
  });
});

describe('goals', () => {
  it('creates goals and moves money in and out', () => {
    const { server } = setup();
    const { api } = login(server);
    setBalance(server, PRIMARY, 100_000);
    const goal = api.keyed('/goals', { name: 'Bike', emoji: '🏍️', target: 500_000 }, 'g').body.goal;
    expect(goal).toMatchObject({ saved: 0, apyBps: 650 });
    const dep = api.keyed(`/goals/${goal.id}/deposit`, { amount: 40_000 }, 'd1');
    expect(dep.body.goal.saved).toBe(40_000);
    expect(dep.body.balance.balance).toBe(60_000);
    expect(api.keyed(`/goals/${goal.id}/deposit`, { amount: 70_000 }, 'd2').body.error.code).toBe(
      'insufficient_funds',
    );
    const wd = api.keyed(`/goals/${goal.id}/withdraw`, { amount: 15_000 }, 'w1');
    expect(wd.body.goal.saved).toBe(25_000);
    expect(wd.body.balance.balance).toBe(75_000);
    expect(api.keyed(`/goals/${goal.id}/withdraw`, { amount: 99_000 }, 'w2').body.error.code).toBe(
      'insufficient_funds',
    );
    expect(api.keyed('/goals/gl_nope/deposit', { amount: 1 }, 'x').status).toBe(404);
    expect(api.keyed('/goals', { name: 'x', emoji: 'y', target: 0 }, 'z').status).toBe(400);
  });

  it('previews interest with integer half-up rounding', () => {
    const { server } = setup();
    const { api } = login(server);
    const id = api.get('/goals').body.items[0].id;
    const res = api.get(`/goals/${id}/interest-preview?amount=1000000&months=12`);
    expect(res.body.preview).toEqual({
      principal: 1_000_000,
      months: 12,
      interest: 65_000,
      maturity: 1_065_000,
    });
    const odd = api.get(`/goals/${id}/interest-preview?amount=12345&months=1`).body.preview;
    expect(Number.isInteger(odd.interest)).toBe(true);
    expect(odd.interest).toBe(Math.round((12345 * 650) / 120_000));
    expect(api.get(`/goals/${id}/interest-preview?amount=-5&months=1`).status).toBe(400);
  });
});

describe('cards', () => {
  it('freezes, blocks reveal, unfreezes and reveals', () => {
    const { server } = setup();
    const { api } = login(server);
    const card = api.get('/cards').body.items[0];
    expect(card.status).toBe('active');
    const shown = api.post(`/cards/${card.id}/reveal`, {}).body.reveal;
    expect(shown.pan).toMatch(/^\d{16}$/);
    expect(shown.cvv).toMatch(/^\d{3}$/);
    expect(api.post(`/cards/${card.id}/freeze`, {}).body.card.status).toBe('frozen');
    expect(api.post(`/cards/${card.id}/freeze`, {}).body.card.status).toBe('frozen');
    const blocked = api.post(`/cards/${card.id}/reveal`, {});
    expect(blocked.status).toBe(423);
    expect(blocked.body.error.code).toBe('card_frozen');
    expect(api.post(`/cards/${card.id}/unfreeze`, {}).body.card.status).toBe('active');
    expect(api.post('/cards/cd_nope/freeze', {}).status).toBe(404);
  });
});

describe('bills', () => {
  it('lists billers and dues', () => {
    const { server } = setup();
    const { api } = login(server);
    expect(api.get('/bills/billers').body.items).toHaveLength(12);
    expect(api.get('/bills/dues').body.items).toHaveLength(3);
  });

  it('charges the exact sum of per-line half-up fees', () => {
    const { server } = setup();
    const { api } = login(server);
    setBalance(server, PRIMARY, 2_000_000);
    const due = api.get('/bills/dues').body.items[0];
    const expectedFee = due.items.reduce(
      (sum: number, i: { amount: number; feeBps: number }) =>
        sum + Math.floor((i.amount * i.feeBps * 2 + 10_000) / 20_000),
      0,
    );
    const amount = due.items.reduce((sum: number, i: { amount: number }) => sum + i.amount, 0);
    const res = api.keyed(
      '/bills/pay',
      { billerId: due.billerId, accountRef: due.accountRef, items: due.items },
      'b1',
    );
    expect(res.status).toBe(200);
    expect(res.body.txn).toMatchObject({ type: 'bill_pay', amount, fee: expectedFee });
    expect(res.body.balance.balance).toBe(2_000_000 - amount - expectedFee);
    const next = api.get('/bills/dues').body.items[0];
    expect(next.dueAt).toBe(due.dueAt + 30 * 86_400_000);
    expect(
      api.keyed(
        '/bills/pay',
        { billerId: due.billerId, accountRef: due.accountRef, items: due.items },
        'b2',
      ).status,
    ).toBe(200);
  });

  it('rejects changed items, unknown bills and low balance', () => {
    const { server } = setup();
    const { api } = login(server);
    const due = api.get('/bills/dues').body.items[0];
    const tampered = due.items.map((i: { amount: number }, n: number) =>
      n === 0 ? { ...i, amount: i.amount - 1 } : i,
    );
    expect(
      api.keyed(
        '/bills/pay',
        { billerId: due.billerId, accountRef: due.accountRef, items: tampered },
        'a',
      ).body.error.code,
    ).toBe('conflict');
    expect(
      api.keyed('/bills/pay', { billerId: due.billerId, accountRef: 'nope', items: due.items }, 'b')
        .status,
    ).toBe(404);
    setBalance(server, PRIMARY, 10);
    expect(
      api.keyed(
        '/bills/pay',
        { billerId: due.billerId, accountRef: due.accountRef, items: due.items },
        'c',
      ).body.error.code,
    ).toBe('insufficient_funds');
  });

  it('recharges mobile billers only', () => {
    const { server } = setup();
    const { api } = login(server);
    setBalance(server, PRIMARY, 100_000);
    const ok = api.keyed(
      '/bills/recharge',
      { billerId: 'bl_mob_1', accountRef: '9800000001', amount: 29_900 },
      'a',
    );
    expect(ok.body.txn).toMatchObject({ type: 'recharge', amount: 29_900, fee: 0 });
    expect(
      api.keyed('/bills/recharge', { billerId: 'bl_elec_1', accountRef: 'x', amount: 100 }, 'b')
        .status,
    ).toBe(400);
    expect(
      api.keyed('/bills/recharge', { billerId: 'bl_none', accountRef: 'x', amount: 100 }, 'c')
        .status,
    ).toBe(404);
    expect(
      api.keyed('/bills/recharge', { billerId: 'bl_mob_1', accountRef: '1', amount: 900_000 }, 'd')
        .body.error.code,
    ).toBe('insufficient_funds');
  });

  it('upserts autopay', () => {
    const { server } = setup();
    const { api } = login(server);
    const body = { billerId: 'bl_elec_1', accountRef: 'EB1', maxAmount: 300_000, enabled: true };
    expect(api.post('/bills/autopay', body).body.autopay).toEqual(body);
    api.post('/bills/autopay', { ...body, enabled: false });
    expect(server.db.t.autopay).toHaveLength(1);
    expect(api.post('/bills/autopay', { ...body, maxAmount: 0 }).status).toBe(400);
    expect(api.post('/bills/autopay', { ...body, billerId: 'bl_x' }).status).toBe(404);
  });
});

describe('profile, limits, kyc, notifications', () => {
  it('reads and updates the profile', () => {
    const { server } = setup();
    const { api } = login(server);
    expect(api.get('/profile').body.user).toMatchObject({ id: PRIMARY, name: 'Aarav Sharma' });
    expect(api.patch('/profile', { name: '  Aarav S  ' }).body.user.name).toBe('Aarav S');
    expect(api.patch('/profile', { name: '   ' }).status).toBe(400);
  });

  it('lists sorted contacts and adds new ones', () => {
    const { server } = setup();
    const { api } = login(server);
    const names = api.get('/profile/contacts').body.items.map((c: { name: string }) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    const added = api.post('/profile/contacts', { name: 'Zed', phone: '+919711000000' });
    expect(added.body.contact).toMatchObject({ name: 'Zed', favourite: false });
    expect(
      api.post('/profile/contacts', { name: 'Zed2', phone: '+919711000000' }).body.error.code,
    ).toBe('conflict');
    expect(api.post('/profile/contacts', { name: 'Me', phone: '+919800000001' }).status).toBe(400);
    server.db.t.contacts = server.db.t.contacts.filter(
      (c) => !(c.ownerId === PRIMARY && c.contact.userId === 'usr_007'),
    );
    const linked = api.post('/profile/contacts', { name: 'Kabir', phone: '+919800000007' });
    expect(linked.body.contact.userId).toBe('usr_007');
  });

  it('stores preferences and mirrors the language', () => {
    const { server } = setup();
    const { api } = login(server);
    const prefs = api.get('/profile/preferences').body.preferences;
    expect(prefs.lockTimeoutSec).toBe(60);
    const next = { ...prefs, language: 'bn', lockTimeoutSec: 300, hideBalance: true };
    expect(api.put('/profile/preferences', next).body.preferences).toEqual(next);
    expect(api.get('/profile').body.user.language).toBe('bn');
    expect(api.put('/profile/preferences', { ...next, lockTimeoutSec: 45 }).status).toBe(400);
  });

  it('computes limits from history', () => {
    const { server } = setup();
    const { api } = login(server);
    setBalance(server, PRIMARY, 1_000_000);
    const before = api.get('/limits').body.limits;
    expect(before).toMatchObject({ tier: 'basic', perTxn: 2_500_000, walletCap: 10_000_000 });
    api.keyed('/transfers', { to: { phone: '+919800000002' }, amount: 100_000 }, 'k');
    const after = api.get('/limits').body.limits;
    expect(after.daily.used).toBe(before.daily.used + 100_000);
    expect(after.monthly.used).toBe(before.monthly.used + 100_000);
  });

  it('upgrades the KYC tier on the fetch after a submission', () => {
    const { server } = setup();
    const { api } = login(server, 'usr_004');
    expect(api.get('/kyc/status').body.status).toEqual({ tier: 'min', state: 'none' });
    expect(
      api.post('/kyc/submit', { docType: 'aadhaar', docLast4: '1234' }).body.status.state,
    ).toBe('in_review');
    expect(api.post('/kyc/submit', { docType: 'pan', docLast4: '1234' }).body.error.code).toBe(
      'conflict',
    );
    expect(api.get('/kyc/status').body.status).toEqual({ tier: 'basic', state: 'approved' });
    expect(api.get('/limits').body.limits.tier).toBe('basic');
    expect(api.post('/kyc/submit', { docType: 'pan', docLast4: '5678' }).status).toBe(200);
    expect(api.get('/kyc/status').body.status.tier).toBe('full');
    expect(api.post('/kyc/submit', { docType: 'pan', docLast4: '5678' }).body.error.code).toBe(
      'conflict',
    );
    expect(api.post('/kyc/submit', { docType: 'passport', docLast4: '5678' }).status).toBe(400);
  });

  it('lists notifications newest first and marks them read', () => {
    const { server } = setup();
    const { api } = login(server);
    const items = api.get('/notifications').body.items;
    expect(items.length).toBeGreaterThan(5);
    for (let i = 1; i < items.length; i += 1)
      expect(items[i - 1].createdAt).toBeGreaterThanOrEqual(items[i].createdAt);
    const unread = items.filter((n: { read: boolean }) => !n.read).map((n: { id: string }) => n.id);
    expect(unread.length).toBeGreaterThan(0);
    expect(api.post('/notifications/read', { ids: [...unread, 'nt_unknown'] }).body).toEqual({
      ok: true,
    });
    expect(
      api
        .get('/notifications')
        .body.items.filter((n: { id: string; read: boolean }) => unread.includes(n.id) && !n.read),
    ).toHaveLength(0);
  });
});
