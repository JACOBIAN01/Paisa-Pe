import type { Txn, TxnType } from '@pp/contracts-domain';

const DEBIT_TYPES: ReadonlySet<TxnType> = new Set([
  'p2p_send',
  'bill_pay',
  'recharge',
  'goal_deposit',
]);

/** Signed effect of a successful transaction on the wallet balance, in paise. */
export function txnDelta(txn: Pick<Txn, 'type' | 'amount' | 'fee' | 'status'>): number {
  if (txn.status !== 'success') return 0;
  return DEBIT_TYPES.has(txn.type) ? -(txn.amount + txn.fee) : txn.amount;
}
