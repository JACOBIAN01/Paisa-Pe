import type { Paise } from '@pp/contracts-domain';
import { paise } from '@pp/core-money';

export interface RiskThresholds {
  /** Amounts at or above this get a warning (default ₹10,000). */
  largeAmount: Paise;
  /** An amount above `unusualMultiple` × the median recent send is unusual. */
  unusualMultiple: number;
  /** Recent sends needed before "unusual" means anything. */
  minSamples: number;
  /** How many recent sends the median is computed over. */
  sampleSize: number;
}

export const DEFAULT_THRESHOLDS: RiskThresholds = {
  largeAmount: paise(1_000_000),
  unusualMultiple: 5,
  minSamples: 3,
  sampleSize: 20,
};
