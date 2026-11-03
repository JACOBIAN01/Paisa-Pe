import type { Txn } from '@pp/contracts-domain';
import { DEFAULT_FILTER, filterTxns, paiseToAmountText } from '../state/filters';

const base = {
  fee: 0,
  balanceAfter: 0,
  createdAt: 1,
  updatedAt: 1,
};
const make = (over: Record<string, unknown>): Txn =>
  ({ id: 'x', type: 'p2p_send', status: 'success', amount: 100, ...base, ...over }) as Txn;

const txns = [
  make({ id: 'a', type: 'p2p_send', counterparty: { name: 'Asha Rao' }, note: 'rent' }),
  make({ id: 'b', type: 'p2p_receive', counterparty: { name: 'Diya' } }),
  make({ id: 'c', type: 'bill_pay', status: 'pending' }),
  make({ id: 'd', type: 'cashback', status: 'failed' }),
];

describe('filterTxns', () => {
  it('returns everything by default', () => {
    expect(filterTxns(txns, DEFAULT_FILTER)).toHaveLength(4);
  });
  it('filters by type group and status', () => {
    expect(filterTxns(txns, { ...DEFAULT_FILTER, group: 'sent' }).map((t) => t.id)).toEqual(['a']);
    expect(filterTxns(txns, { ...DEFAULT_FILTER, group: 'bills' }).map((t) => t.id)).toEqual(['c']);
    expect(filterTxns(txns, { ...DEFAULT_FILTER, status: 'failed' }).map((t) => t.id)).toEqual([
      'd',
    ]);
  });
  it('searches name and note case-insensitively', () => {
    expect(filterTxns(txns, { ...DEFAULT_FILTER, query: ' ASHA ' }).map((t) => t.id)).toEqual([
      'a',
    ]);
    expect(filterTxns(txns, { ...DEFAULT_FILTER, query: 'rent' }).map((t) => t.id)).toEqual(['a']);
    expect(filterTxns(txns, { ...DEFAULT_FILTER, query: 'nobody' })).toEqual([]);
  });
});

describe('paiseToAmountText', () => {
  it.each([
    [0, '0.00'],
    [5, '0.05'],
    [12550, '125.50'],
    [100, '1.00'],
  ])('%i -> %s', (paise, text) => {
    expect(paiseToAmountText(paise)).toBe(text);
  });
});
