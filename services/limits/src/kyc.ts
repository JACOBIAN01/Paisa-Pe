import type { KycTier } from '@pp/contracts-domain';

const ORDER: readonly KycTier[] = ['min', 'basic', 'full'];

export const tierRank = (tier: KycTier): number => ORDER.indexOf(tier);

export const nextTier = (tier: KycTier): KycTier | null => ORDER[tierRank(tier) + 1] ?? null;

export const canUpgrade = (tier: KycTier): boolean => nextTier(tier) !== null;

export const tierAtLeast = (tier: KycTier, required: KycTier): boolean =>
  tierRank(tier) >= tierRank(required);
