import type { ContactId, Paise } from '@pp/contracts-domain';
import { paise } from '@pp/core-money';
import { createRequestsService } from '../service';
import { createEnv } from './helpers';

const PAYER = 'usr_001';
const REQUESTER = 'usr_002';

// usr_002's contact list starts with every other demo user, so ct_002_01 is usr_001.
const PAYER_AS_CONTACT = 'ct_002_01' as ContactId;

function setup() {
  const requesterEnv = createEnv(REQUESTER);
  const payerEnv = createEnv(PAYER, requesterEnv.server);
  return {
    server: requesterEnv.server,
    requesterEnv,
    requester: createRequestsService(requesterEnv),
    payerEnv,
    payer: createRequestsService(payerEnv),
  };
}

describe('requests service', () => {
  it('refreshes the inbox keyed by id', async () => {
    const { requester } = setup();
    const created = await requester.create({ from: PAYER_AS_CONTACT, amount: paise(2500) });
    expect(requester.outgoing().map((r) => r.id)).toEqual([created.id]);
    expect(await requester.refresh('outgoing')).toHaveLength(1);
    expect(requester.get(created.id)?.status).toBe('pending');
  });

  it('emits request.created and request.updated', async () => {
    const { requester, requesterEnv } = setup();
    const created: string[] = [];
    const updated: string[] = [];
    requesterEnv.bus.on('request.created', ({ request }) => created.push(request.id));
    requesterEnv.bus.on('request.updated', ({ request }) => updated.push(request.status));
    const request = await requester.create({ from: PAYER_AS_CONTACT, amount: paise(1000) });
    await requester.cancel(request.id);
    expect(created).toEqual([request.id]);
    expect(updated).toEqual(['cancelled']);
  });

  it('notifies subscribers and stops after unsubscribe', async () => {
    const { requester } = setup();
    const seen: number[] = [];
    const off = requester.subscribe((state) => seen.push(state.byId.size));
    await requester.create({ from: PAYER_AS_CONTACT, amount: paise(1000) });
    off();
    await requester.create({ from: PAYER_AS_CONTACT, amount: paise(1000) });
    expect(seen).toEqual([1]);
  });

  it('pays once when pay is called twice at the same time', async () => {
    const { server, requester, payer } = setup();
    const request = await requester.create({ from: PAYER_AS_CONTACT, amount: paise(4000) });
    const before = server.admin.getBalance(PAYER).balance;
    const [a, b] = await Promise.all([payer.pay(request.id), payer.pay(request.id)]);
    expect(a).toBe(b);
    expect(a.status).toBe('paid');
    expect(before - server.admin.getBalance(PAYER).balance).toBe(4000);
  });

  it('pays the request that was asked for, not whatever sits first in the list', async () => {
    const { requester, payer } = setup();
    const first = await requester.create({ from: PAYER_AS_CONTACT, amount: paise(1100) });
    const second = await requester.create({ from: PAYER_AS_CONTACT, amount: paise(2200) });
    await payer.refresh('incoming');
    expect(payer.incoming()).toHaveLength(2);
    const paid = await payer.pay(first.id);
    expect(paid.id).toBe(first.id);
    expect(paid.amount).toBe(1100);
    expect(payer.get(second.id)?.status).toBe('pending');
  });

  it('reports request_not_pending when paying again later', async () => {
    const { server, requester, payer } = setup();
    const request = await requester.create({ from: PAYER_AS_CONTACT, amount: paise(900) });
    await payer.pay(request.id);
    const balance = server.admin.getBalance(PAYER).balance;
    await expect(payer.pay(request.id)).rejects.toMatchObject({ code: 'request_not_pending' });
    expect(server.admin.getBalance(PAYER).balance).toBe(balance);
  });

  it('declines and counts pending incoming', async () => {
    const { requester, payer } = setup();
    const request = await requester.create({ from: PAYER_AS_CONTACT, amount: paise(900) });
    await payer.refresh();
    expect(payer.pendingIncomingCount()).toBe(1);
    await payer.decline(request.id);
    expect(payer.pendingIncomingCount()).toBe(0);
  });

  it('creates a split: others are requested, the requester slice is not', async () => {
    const { requester } = setup();
    const result = await requester.createSplit({
      total: paise(10_000),
      mode: 'equal',
      participants: [{ ref: 'self' }, { ref: PAYER_AS_CONTACT }, { ref: 'ct_002_02' as ContactId }],
    });
    const requested = result.requests.reduce<number>((acc, r) => acc + r.amount, 0);
    expect(result.requests).toHaveLength(2);
    expect(requested).toBe(6666);
    expect(requested + 3334).toBe(10_000);
  });

  it('rejects an invalid split before calling the server', async () => {
    const { requester } = setup();
    await expect(
      requester.createSplit({ total: 0 as Paise, participants: [], mode: 'equal' }),
    ).rejects.toMatchObject({ code: 'invalid_request' });
  });

  it('reuses the idempotency key while an intent is unfinished', async () => {
    const { server, requester, requesterEnv } = setup();
    server.chaos.dropResponse();
    const intentId = 'intent-1';
    const input = { from: PAYER_AS_CONTACT, amount: paise(700) };
    await expect(requester.create(input, { intentId })).rejects.toBeDefined();
    const keysBefore = await requesterEnv.storage.keys('requests:intent:');
    expect(keysBefore).toHaveLength(1);
    const retried = await requester.create(input, { intentId });
    expect(retried.amount).toBe(700);
    expect(await requesterEnv.storage.keys('requests:intent:')).toHaveLength(0);
    expect(requester.outgoing()).toHaveLength(1);
  });
});
