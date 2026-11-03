import type { Biller, BillDue } from '@pp/contracts-domain';

export type Category = Biller['category'];

export const CATEGORY_ORDER: readonly Category[] = [
  'electricity',
  'water',
  'gas',
  'mobile',
  'dth',
  'broadband',
];

export const RECHARGE_CATEGORIES: readonly Category[] = ['mobile', 'dth'];

export type BillsTab = 'dues' | 'billers' | 'recharge';

export const dueKey = (due: Pick<BillDue, 'billerId' | 'accountRef'>): string =>
  `${due.billerId}:${due.accountRef}`;

export function groupByCategory(billers: readonly Biller[]): Array<[Category, Biller[]]> {
  return CATEGORY_ORDER.map((category): [Category, Biller[]] => [
    category,
    billers.filter((b) => b.category === category),
  ]).filter(([, list]) => list.length > 0);
}

export const isValidAccountRef = (value: string): boolean => /^[A-Za-z0-9-]{6,20}$/.test(value);
