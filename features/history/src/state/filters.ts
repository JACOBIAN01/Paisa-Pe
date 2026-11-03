import type { Txn, TxnStatus, TxnType } from '@pp/contracts-domain';
import type { MessageKey } from '@pp/core-i18n';

export type TypeGroup = 'all' | 'sent' | 'received' | 'bills' | 'rewards';
export type StatusFilter = 'all' | TxnStatus;

export interface TxnFilter {
  group: TypeGroup;
  status: StatusFilter;
  query: string;
}

export const DEFAULT_FILTER: TxnFilter = { group: 'all', status: 'all', query: '' };

const GROUPS: Record<Exclude<TypeGroup, 'all'>, ReadonlySet<TxnType>> = {
  sent: new Set<TxnType>(['p2p_send', 'goal_deposit']),
  received: new Set<TxnType>(['p2p_receive', 'add_money', 'goal_withdraw']),
  bills: new Set<TxnType>(['bill_pay', 'recharge']),
  rewards: new Set<TxnType>(['cashback', 'refund']),
};

export const GROUP_OPTIONS: { value: TypeGroup; label: MessageKey }[] = [
  { value: 'all', label: 'history.filterAll' },
  { value: 'sent', label: 'history.sent' },
  { value: 'received', label: 'history.received' },
  { value: 'bills', label: 'history.filterBills' },
  { value: 'rewards', label: 'history.filterRewards' },
];

export const STATUS_OPTIONS: { value: StatusFilter; label: MessageKey }[] = [
  { value: 'all', label: 'history.filterAll' },
  { value: 'success', label: 'history.status.success' },
  { value: 'pending', label: 'history.status.pending' },
  { value: 'failed', label: 'history.status.failed' },
];

const normalise = (text: string): string => text.trim().toLowerCase();

function matchesQuery(txn: Txn, query: string): boolean {
  if (query === '') return true;
  const haystack = [txn.counterparty?.name, txn.counterparty?.phone, txn.note, txn.type]
    .filter((part): part is string => typeof part === 'string')
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

export function filterTxns(txns: Txn[], filter: TxnFilter): Txn[] {
  const query = normalise(filter.query);
  const group = filter.group === 'all' ? null : GROUPS[filter.group];
  return txns.filter(
    (txn) =>
      (group === null || group.has(txn.type)) &&
      (filter.status === 'all' || txn.status === filter.status) &&
      matchesQuery(txn, query),
  );
}

export const isIncoming = (txn: Txn): boolean =>
  txn.type === 'p2p_receive' ||
  txn.type === 'add_money' ||
  txn.type === 'cashback' ||
  txn.type === 'refund' ||
  txn.type === 'goal_withdraw';

/** Rupee text a route param can carry, built with integer maths only: 12550 -> "125.50". */
export function paiseToAmountText(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const rest = String(paise % 100).padStart(2, '0');
  return `${rupees}.${rest}`;
}
