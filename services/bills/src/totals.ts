import type { BillLineItem, Paise, Txn } from '@pp/contracts-domain';
import { add, paise, sumFees, feeFor, ZERO } from '@pp/core-money';

export interface BillLineTotal {
  label: string;
  amount: Paise;
  fee: Paise;
}

export interface BillTotal {
  lines: BillLineTotal[];
  subtotal: Paise;
  /** Sum of per-line fees, each rounded half-up once. */
  fee: Paise;
  total: Paise;
}

export function computeBillTotal(items: readonly BillLineItem[]): BillTotal {
  const lines = items.map((item) => ({
    label: item.label,
    amount: item.amount,
    fee: feeFor(item.amount, item.feeBps),
  }));
  const subtotal = lines.reduce<Paise>((acc, line) => add(acc, line.amount), ZERO);
  const fee = sumFees(items);
  return { lines, subtotal, fee, total: paise(subtotal + fee) };
}

export interface TotalsComparison {
  matches: boolean;
  amountDiff: number;
  feeDiff: number;
}

/** Compares what the app showed against what the server booked. Differences are signed paise. */
export function compareWithTxn(expected: BillTotal, txn: Pick<Txn, 'amount' | 'fee'>) {
  const amountDiff = txn.amount - expected.subtotal;
  const feeDiff = txn.fee - expected.fee;
  const result: TotalsComparison = {
    matches: amountDiff === 0 && feeDiff === 0,
    amountDiff,
    feeDiff,
  };
  return result;
}
