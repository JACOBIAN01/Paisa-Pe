import { DAY_MS } from '@pp/mock-db';
import { DIYA, DIYA_CONTACT, PRIMARY, login, setBalance, setup } from './helpers';

const EXTERNAL_CONTACT = 'ct_001_10';

describe('money requests', () => {
  it('creates, lists and pays a request atomically', () => {
    const { server } = setup();
    const me = login(server);
    const diya = login(server, DIYA);
    setBalance(server, DIYA, 500_000);
    const before = server.admin.getBalance(PRIMARY).balance;
    const created = me.api.keyed(
      '/requests',
      { from: DIYA_CONTACT, amount: 120_000, note: 'Trip' },
      'r1',
    );
    expect(created.status).toBe(200);
    const id = created.body.request.id;
    expect(created.body.request).toMatchObject({
      status: 'pending',
      requesterId: PRIMARY,
      payerId: DIYA,
    });
    expect(me.api.get('/requests?direction=outgoing').body.items).toHaveLength(1);
    expect(diya.api.get('/requests?direction=incoming').body.items[0].id).toBe(id);
    expect(diya.api.get('/notifications').body.items[0].kind).toBe('request');

    const paid = diya.api.keyed(`/requests/${id}/pay`, undefined, 'p1');
    expect(paid.status).toBe(200);
    expect(paid.body.request.status).toBe('paid');
    expect(paid.body.balance.balance).toBe(380_000);
    expect(server.admin.getBalance(PRIMARY).balance).toBe(before + 120_000);
    expect(diya.api.keyed(`/requests/${id}/pay`, undefined, 'p2').body.error.code).toBe(
      'request_not_pending',
    );
    expect(
      diya.api.keyed(`/requests/${id}/pay`, undefined, 'p1').headers['idempotency-replayed'],
    ).toBe('true');
  });

  it('does not let the requester pay or the payer cancel', () => {
    const { server } = setup();
    const me = login(server);
    const diya = login(server, DIYA);
    const id = me.api.keyed('/requests', { from: DIYA_CONTACT, amount: 1000 }, 'r').body.request.id;
    expect(me.api.keyed(`/requests/${id}/pay`, undefined, 'x').status).toBe(404);
    expect(diya.api.post(`/requests/${id}/cancel`, {}).status).toBe(404);
    expect(me.api.post(`/requests/${id}/decline`, {}).status).toBe(404);
  });

  it('declines, cancels and expires', () => {
    const { server, clock } = setup();
    const me = login(server);
    const diya = login(server, DIYA);
    const a = me.api.keyed('/requests', { from: DIYA_CONTACT, amount: 1000 }, 'a').body.request.id;
    const b = me.api.keyed('/requests', { from: DIYA_CONTACT, amount: 2000 }, 'b').body.request.id;
    const c = me.api.keyed('/requests', { from: DIYA_CONTACT, amount: 3000 }, 'c').body.request.id;
    expect(diya.api.post(`/requests/${a}/decline`, {}).body.request.status).toBe('declined');
    expect(me.api.post(`/requests/${b}/cancel`, {}).body.request.status).toBe('cancelled');
    expect(me.api.post(`/requests/${b}/cancel`, {}).body.error.code).toBe('request_not_pending');
    clock.advance(8 * DAY_MS);
    setBalance(server, DIYA, 100_000);
    const later = { me: login(server).api, diya: login(server, DIYA).api };
    expect(later.diya.keyed(`/requests/${c}/pay`, undefined, 'late').body.error.code).toBe(
      'request_not_pending',
    );
    expect(
      later.me.get('/requests').body.items.find((r: { id: string }) => r.id === c).status,
    ).toBe('expired');
  });

  it('validates the payer and amount', () => {
    const { server } = setup();
    const { api } = login(server);
    expect(
      api.keyed('/requests', { from: EXTERNAL_CONTACT, amount: 1000 }, 'a').body.error.code,
    ).toBe('invalid_request');
    expect(api.keyed('/requests', { from: 'ct_missing', amount: 1000 }, 'b').status).toBe(404);
    expect(api.keyed('/requests', { from: DIYA_CONTACT, amount: 0 }, 'c').status).toBe(400);
    expect(api.get('/requests?direction=sideways').status).toBe(400);
  });

  it('fans a split out into one request per participant', () => {
    const { server } = setup();
    const { api } = login(server);
    const res = api.keyed(
      '/splits',
      {
        total: 100_000,
        shares: [
          { contactId: 'ct_001_01', share: 33_334 },
          { contactId: 'ct_001_02', share: 33_333 },
        ],
        note: 'Dinner',
      },
      's1',
    );
    expect(res.status).toBe(200);
    expect(res.body.requests).toHaveLength(2);
    expect(
      res.body.requests.every((r: { splitId: string }) => r.splitId === res.body.split.id),
    ).toBe(true);
    expect(res.body.requests.map((r: { amount: number }) => r.amount)).toEqual([33_334, 33_333]);
  });

  it('rejects invalid splits', () => {
    const { server } = setup();
    const { api } = login(server);
    const share = (contactId: string, amount: number) => ({ contactId, share: amount });
    expect(
      api.keyed(
        '/splits',
        { total: 1000, shares: [share('ct_001_01', 600), share('ct_001_02', 600)] },
        'a',
      ).status,
    ).toBe(400);
    expect(
      api.keyed(
        '/splits',
        { total: 1000, shares: [share('ct_001_01', 100), share('ct_001_01', 100)] },
        'b',
      ).status,
    ).toBe(400);
    expect(api.keyed('/splits', { total: 1000, shares: [] }, 'c').status).toBe(400);
    expect(
      api.keyed('/splits', { total: 1000, shares: [share(EXTERNAL_CONTACT, 100)] }, 'd').status,
    ).toBe(400);
  });
});
