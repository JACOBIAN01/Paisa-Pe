import type { Session, Txn, UserId } from '@pp/contracts-domain';
import type { Chaos, DropMode, RequestMatcher } from '@pp/mock-chaos';
import {
  issueSession,
  paise,
  postTxn,
  userId as asUserId,
  type Database,
  type DeviceInfo,
  type TableName,
  notificationId,
  walletOf,
} from '@pp/mock-db';

export interface AdminDeps {
  db: Database;
  chaos: Chaos;
  /** Server time in epoch ms. */
  now(): number;
  initialSeed: number;
  reseed(seed: number): void;
  advance(ms: number): void;
}

export interface MockAdmin {
  /** Rebuild all fixtures with the original seed. */
  reset(): void;
  /** Rebuild all fixtures with a different seed. */
  seed(seed: number): void;
  loginAs(userId: string, device?: DeviceInfo): Session;
  credit(userId: string, amountPaise: number): Txn;
  receivePayment(toUserId: string, fromUserId: string, amountPaise: number, note?: string): Txn;
  setClockSkew(ms: number): void;
  advanceClock(ms: number): void;
  inspect(table: TableName): unknown;
  getBalance(userId: string): { balance: number; version: number };
  listTxns(userId: string): Txn[];
  countTransfersWithKey(userId: string, key: string): number;
  failNext: Chaos['failNext'];
  timeoutNext: (matcher?: RequestMatcher, count?: number) => void;
  dropResponse: (matcher?: RequestMatcher, count?: number, mode?: DropMode) => void;
}

export function createAdmin(deps: AdminDeps): MockAdmin {
  const { db, chaos } = deps;
  const need = (id: string): UserId => {
    const key = asUserId(id);
    if (!db.t.users.has(key)) throw new Error(`unknown user ${id}`);
    return key;
  };
  const publicTxn = ({ ownerId: _ownerId, ...txn }: ReturnType<typeof postTxn>): Txn => txn;

  return {
    reset: () => deps.reseed(deps.initialSeed),
    seed: (seed) => deps.reseed(seed),
    loginAs: (id, device) => issueSession(db, deps.now(), need(id), device),
    credit(id, amountPaise) {
      return publicTxn(
        postTxn(db, deps.now(), {
          ownerId: need(id),
          type: 'add_money',
          amount: amountPaise,
          counterparty: { name: 'Admin credit' },
        }),
      );
    },
    receivePayment(toId, fromId, amountPaise, note) {
      const to = need(toId);
      const from = db.t.users.get(need(fromId));
      const now = deps.now();
      const txn = postTxn(db, now, {
        ownerId: to,
        type: 'p2p_receive',
        amount: amountPaise,
        counterparty: from
          ? { userId: from.user.id, name: from.user.name, phone: from.user.phone }
          : undefined,
        note,
      });
      db.t.notifications.push({
        ownerId: to,
        notification: {
          id: notificationId(db.nextId('nt')),
          kind: 'payment',
          title: 'Money received',
          body: `${from?.user.name ?? 'Someone'} sent you ₹${(amountPaise / 100).toFixed(2)}`,
          read: false,
          createdAt: now,
          route: { name: 'txn-detail', params: { id: txn.id } },
        },
      });
      return publicTxn(txn);
    },
    setClockSkew: (ms) => chaos.clockSkew(ms),
    advanceClock: (ms) => deps.advance(ms),
    inspect: (table) => db.snapshot().tables[table],
    getBalance(id) {
      const wallet = walletOf(db, need(id));
      return { balance: paise(wallet.balance), version: wallet.version };
    },
    listTxns: (id) => db.t.txns.filter((t) => t.ownerId === need(id)).map(publicTxn),
    countTransfersWithKey: (id, key) =>
      db.t.txns.filter(
        (t) => t.ownerId === need(id) && t.type === 'p2p_send' && t.idempotencyKey === key,
      ).length,
    failNext: (matcher, count, response) => chaos.failNext(matcher, count, response),
    timeoutNext: (matcher, count) => chaos.timeoutNext(matcher, count),
    dropResponse: (matcher, count, mode) => chaos.dropResponse(matcher, count, mode),
  };
}
