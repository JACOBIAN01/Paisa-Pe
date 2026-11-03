import type { Contact, Counterparty, TxnStatus, TxnType } from '@pp/contracts-domain';
import type { Database } from '../database';
import { paise, txnId, userId } from '../ids';
import type { Rng } from '../rng';
import { DAY_MS } from '../ops/time';
import type { TxnRecord } from '../types';

export const PRIMARY_TXN_COUNT = 300;
export const OTHER_TXN_COUNT = 12;
/** Chronological indexes [47+50k .. 52+50k] of each user's history share one timestamp. */
export const CLUSTER_START = 47;
export const CLUSTER_LENGTH = 6;
export const CLUSTER_PERIOD = 50;

const WEIGHTS: ReadonlyArray<readonly [TxnType, number]> = [
  ['p2p_send', 35],
  ['p2p_receive', 25],
  ['bill_pay', 10],
  ['add_money', 8],
  ['recharge', 8],
  ['cashback', 7],
  ['goal_deposit', 3],
  ['goal_withdraw', 2],
  ['refund', 2],
];

const CREDITS = new Set<TxnType>([
  'p2p_receive',
  'add_money',
  'cashback',
  'refund',
  'goal_withdraw',
]);
const RECHARGE_PLANS = [14900, 23900, 29900, 39900, 59900, 71900];

function amountFor(rng: Rng, type: TxnType): number {
  switch (type) {
    case 'p2p_send':
    case 'p2p_receive':
      return rng.int(50, 5000) * 100 + (rng.chance(0.2) ? 50 : 0);
    case 'bill_pay':
      return rng.int(300, 3000) * 100 + rng.int(0, 99);
    case 'add_money':
      return rng.int(5, 50) * 10000;
    case 'recharge':
      return rng.pick(RECHARGE_PLANS);
    case 'cashback':
      return rng.int(10, 100) * 100;
    case 'refund':
      return rng.int(100, 1000) * 100;
    case 'goal_deposit':
      return rng.int(5, 30) * 10000;
    case 'goal_withdraw':
      return rng.int(5, 20) * 10000;
  }
}

export interface TxnSeedOptions {
  ownerId: string;
  count: number;
  now: number;
  /** Highest balance the history may reach (keeps users under their wallet cap). */
  ceiling: number;
  contacts: Contact[];
  spanDays: number;
}

export function seedTxns(db: Database, rng: Rng, options: TxnSeedOptions): void {
  const ownerId = userId(options.ownerId);
  const wallet = db.t.wallets.get(ownerId);
  if (!wallet) throw new Error('wallet missing');
  const newest = options.now - 26 * 3_600_000;
  const stepMax = Math.max(2, Math.floor((options.spanDays * DAY_MS) / options.count));
  const times: number[] = [];
  let t = newest - options.spanDays * DAY_MS;
  for (let i = 0; i < options.count; i += 1) {
    t += rng.int(Math.floor(stepMax / 4), stepMax + Math.floor(stepMax / 2));
    times.push(t);
  }
  const overshoot = (times[times.length - 1] as number) - newest;
  for (let i = 0; i < times.length; i += 1)
    times[i] = (times[i] as number) - Math.max(0, overshoot);
  for (let start = CLUSTER_START; start < options.count; start += CLUSTER_PERIOD) {
    for (let i = start; i < Math.min(start + CLUSTER_LENGTH, options.count); i += 1) {
      times[i] = times[start] as number;
    }
  }

  let balance = rng.int(5, 20) * 100_000;
  const records: TxnRecord[] = [];
  for (let i = 0; i < options.count; i += 1) {
    let type = rng.weighted(WEIGHTS);
    let amount = amountFor(rng, type);
    const credit = CREDITS.has(type);
    if (!credit && amount > balance) {
      type = 'add_money';
      amount = amountFor(rng, type);
    } else if (credit && balance + amount > options.ceiling) {
      type = 'p2p_send';
      amount = Math.min(amountFor(rng, type), balance);
    }
    if (amount <= 0) continue;
    const isCredit = CREDITS.has(type);
    const fee = type === 'bill_pay' ? Math.round((amount * 118) / 10000) : 0;
    let status: TxnStatus = 'success';
    if (!isCredit && rng.chance(0.03)) status = 'failed';
    if (status === 'success') {
      balance += isCredit ? amount : -(amount + fee);
      if (balance < 0) {
        balance += amount + fee;
        status = 'failed';
      }
    }
    const contact = rng.pick(options.contacts);
    const counterparty: Counterparty | undefined =
      type === 'p2p_send' || type === 'p2p_receive'
        ? { userId: contact.userId, name: contact.name, phone: contact.phone }
        : undefined;
    const ts = times[i] as number;
    records.push({
      ownerId,
      id: txnId(db.nextId('txn')),
      type,
      status,
      amount: paise(amount),
      fee: paise(fee),
      balanceAfter: paise(balance),
      counterparty,
      note:
        counterparty && rng.chance(0.4)
          ? rng.pick(['Dinner', 'Rent share', 'Movie', 'Cab', 'Gift'])
          : undefined,
      createdAt: ts,
      updatedAt: ts,
    });
  }
  db.t.txns.push(...records);
  wallet.balance = paise(balance);
  wallet.version = records.length;
  const last = records[records.length - 1];
  if (last) db.meta.lastStamp = Math.max(db.meta.lastStamp, last.updatedAt);
}
