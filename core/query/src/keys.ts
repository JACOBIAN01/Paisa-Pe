import type { QueryKey } from './key';

/**
 * Every key starts with the user id, so one user's cache can never be read as another's
 * and `clearUser` is a prefix operation.
 */
export const keys = {
  user: (userId: string): QueryKey => [userId],
  balance: (userId: string): QueryKey => [userId, 'balance'],
  limits: (userId: string): QueryKey => [userId, 'limits'],
  profile: (userId: string): QueryKey => [userId, 'profile'],
  preferences: (userId: string): QueryKey => [userId, 'preferences'],
  contacts: (userId: string): QueryKey => [userId, 'contacts'],
  transactions: (userId: string, page: number | string = 0): QueryKey => [
    userId,
    'transactions',
    page,
  ],
  transaction: (userId: string, id: string): QueryKey => [userId, 'transaction', id],
  requests: (userId: string, direction: 'incoming' | 'outgoing' | 'all' = 'all'): QueryKey => [
    userId,
    'requests',
    direction,
  ],
  coupons: (userId: string): QueryKey => [userId, 'coupons'],
  cashback: (userId: string): QueryKey => [userId, 'cashback'],
  scratchCards: (userId: string): QueryKey => [userId, 'scratch-cards'],
  referral: (userId: string): QueryKey => [userId, 'referral'],
  goals: (userId: string): QueryKey => [userId, 'goals'],
  cards: (userId: string): QueryKey => [userId, 'cards'],
  billers: (userId: string): QueryKey => [userId, 'billers'],
  dues: (userId: string): QueryKey => [userId, 'dues'],
  notifications: (userId: string): QueryKey => [userId, 'notifications'],
  kycStatus: (userId: string): QueryKey => [userId, 'kyc-status'],
  devices: (userId: string): QueryKey => [userId, 'devices'],
};
