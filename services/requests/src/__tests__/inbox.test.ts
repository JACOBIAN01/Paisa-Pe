import type { MoneyRequest, RequestId, UserId } from '@pp/contracts-domain';
import { paise } from '@pp/core-money';
import {
  emptyInbox,
  pendingIncomingCount,
  removeMissing,
  selectRequests,
  upsertRequests,
} from '../inbox';

const me = 'usr_001' as UserId;
const other = 'usr_002' as UserId;

const req = (id: string, extra: Partial<MoneyRequest> = {}): MoneyRequest => ({
  id: id as RequestId,
  requesterId: other,
  payerId: me,
  amount: paise(5000),
  status: 'pending',
  createdAt: 1000,
  updatedAt: 1000,
  expiresAt: 9_999_999,
  ...extra,
});

describe('inbox', () => {
  it('keys requests by id and sorts newest first', () => {
    const state = upsertRequests(emptyInbox(), [
      req('a', { createdAt: 1 }),
      req('b', { createdAt: 3 }),
      req('c', { createdAt: 2 }),
    ]);
    expect(selectRequests(state, me, 'incoming').map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('never replaces a newer copy with an older one', () => {
    const fresh = upsertRequests(emptyInbox(), [req('a', { status: 'paid', updatedAt: 20 })]);
    const state = upsertRequests(fresh, [req('a', { status: 'pending', updatedAt: 10 })]);
    expect(state.byId.get('a' as RequestId)?.status).toBe('paid');
  });

  it('splits incoming from outgoing', () => {
    const state = upsertRequests(emptyInbox(), [
      req('in'),
      req('out', { requesterId: me, payerId: other }),
    ]);
    expect(selectRequests(state, me, 'incoming').map((r) => r.id)).toEqual(['in']);
    expect(selectRequests(state, me, 'outgoing').map((r) => r.id)).toEqual(['out']);
  });

  it('drops requests the server no longer lists, only in that direction', () => {
    let state = upsertRequests(emptyInbox(), [
      req('in1'),
      req('in2'),
      req('out', { requesterId: me, payerId: other }),
    ]);
    state = removeMissing(state, me, 'incoming', [req('in1')]);
    expect([...state.byId.keys()].sort()).toEqual(['in1', 'out']);
  });

  it('counts pending incoming', () => {
    const state = upsertRequests(emptyInbox(), [req('a'), req('b', { status: 'paid' })]);
    expect(pendingIncomingCount(state, me)).toBe(1);
  });
});
