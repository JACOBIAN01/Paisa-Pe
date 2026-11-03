import type { Autopay, Biller, BillDue, BillerId, Paise, Txn, UserId } from '@pp/contracts-domain';
import type { AppEventMap } from '@pp/contracts-events';
import type { EventBus } from '@pp/core-event-bus';
import type { HttpClient } from '@pp/core-net';
import { AppError } from '@pp/core-result';
import type { JsonStore } from '@pp/core-storage';
import { createIntentId, createIntentRunner } from './intent';
import { compareWithTxn, computeBillTotal, type BillTotal, type TotalsComparison } from './totals';

export interface BillsDeps {
  http: HttpClient;
  /** Must be scoped to `userId`. */
  storage: JsonStore;
  bus: EventBus<AppEventMap>;
  userId: UserId;
}

export interface IntentOptions {
  /** Reuse the same id for every retry of one payment. */
  intentId?: string;
}

export interface BillPayment {
  txn: Txn;
  expected: BillTotal;
  comparison: TotalsComparison;
}

export interface BillsService {
  billers(): Promise<Biller[]>;
  dues(): Promise<BillDue[]>;
  totalFor(due: BillDue): BillTotal;
  pay(due: BillDue, opts?: IntentOptions): Promise<BillPayment>;
  recharge(
    billerId: BillerId,
    accountRef: string,
    amount: Paise,
    opts?: IntentOptions,
  ): Promise<Txn>;
  setAutopay(autopay: Autopay): Promise<Autopay>;
}

export function createBillsService(deps: BillsDeps): BillsService {
  const { http, bus } = deps;
  const intents = createIntentRunner(deps.storage, 'bills');

  const announce = (balance: { balance: Paise; version: number }): void => {
    bus.emit('balance.changed', {
      balance: balance.balance,
      version: balance.version,
      source: 'payment',
    });
  };

  return {
    async billers() {
      return (await http.call('bills.billers')).items;
    },
    async dues() {
      return (await http.call('bills.dues')).items;
    },
    totalFor: (due) => computeBillTotal(due.items),

    async pay(due, opts) {
      const expected = computeBillTotal(due.items);
      return intents.run(opts?.intentId ?? createIntentId(), async (key) => {
        const { txn, balance } = await http.call('bills.pay', {
          body: { billerId: due.billerId, accountRef: due.accountRef, items: due.items },
          idempotencyKey: key,
        });
        announce(balance);
        return { txn, expected, comparison: compareWithTxn(expected, txn) };
      });
    },

    async recharge(billerId, accountRef, amount, opts) {
      if (accountRef.trim().length === 0 || !Number.isSafeInteger(amount) || amount <= 0) {
        throw new AppError('invalid_request', 'Enter a number and a valid amount');
      }
      return intents.run(opts?.intentId ?? createIntentId(), async (key) => {
        const { txn, balance } = await http.call('bills.recharge', {
          body: { billerId, accountRef: accountRef.trim(), amount },
          idempotencyKey: key,
        });
        announce(balance);
        return txn;
      });
    },

    async setAutopay(autopay) {
      return (await http.call('bills.setAutopay', { body: autopay })).autopay;
    },
  };
}
