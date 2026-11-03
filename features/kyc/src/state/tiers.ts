import type { KycTier } from '@pp/contracts-domain';

export const TIERS: ReadonlyArray<{ tier: KycTier; title: string; perks: string }> = [
  {
    tier: 'min',
    title: 'Minimum KYC',
    perks: 'Pay up to ₹10,000 a month. Wallet balance up to ₹10,000.',
  },
  {
    tier: 'basic',
    title: 'Basic KYC',
    perks: 'Pay up to ₹1,00,000 a month. Wallet balance up to ₹1,00,000.',
  },
  {
    tier: 'full',
    title: 'Full KYC',
    perks: 'Higher limits, savings goals and virtual card top-ups.',
  },
];

export const tierIndex = (tier: KycTier): number => TIERS.findIndex((entry) => entry.tier === tier);
export const isLast4 = (value: string): boolean => /^\d{4}$/.test(value);
