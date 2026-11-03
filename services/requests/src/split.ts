import type { ContactId, Paise, SplitShare } from '@pp/contracts-domain';
import { allocate, paise, splitEvenly } from '@pp/core-money';
import { AppError, err, ok, type Result } from '@pp/core-result';

export type SplitMode = 'equal' | 'custom' | 'percent';

/** `'self'` is the requester's own slice of the bill. */
export type ParticipantRef = ContactId | 'self';

export interface SplitParticipant {
  ref: ParticipantRef;
  /** Required in `custom` mode. */
  amount?: Paise;
  /** Required in `percent` mode; 10_000 bps = 100%. */
  percentBps?: number;
}

export interface SplitPlan {
  mode: SplitMode;
  total: Paise;
  /** One entry per participant, in input order. Always sums to `total`. */
  parts: { ref: ParticipantRef; share: Paise }[];
  /** Shares owed by other people; this is what gets requested. */
  shares: SplitShare[];
  selfShare: Paise;
}

export const MAX_PARTICIPANTS = 50;
export const MIN_SHARE: Paise = paise(100);

const invalid = (message: string, details?: Record<string, unknown>) =>
  err(new AppError('invalid_request', message, { details }));

function validateParticipants(
  total: Paise,
  participants: readonly SplitParticipant[],
): AppError | null {
  if (!Number.isSafeInteger(total) || total <= 0) {
    return new AppError('invalid_request', 'Total must be a positive amount');
  }
  if (participants.length === 0 || participants.length > MAX_PARTICIPANTS) {
    return new AppError('invalid_request', `Split between 1 and ${MAX_PARTICIPANTS} people`);
  }
  const refs = participants.map((p) => p.ref);
  if (new Set(refs).size !== refs.length) {
    return new AppError('invalid_request', 'Each person can appear only once');
  }
  return null;
}

function partsFor(
  mode: SplitMode,
  total: Paise,
  participants: readonly SplitParticipant[],
): Result<Paise[]> {
  if (mode === 'equal') return ok(splitEvenly(total, participants.length));

  if (mode === 'custom') {
    const amounts = participants.map((p) => p.amount);
    if (!amounts.every((a): a is Paise => a !== undefined && Number.isSafeInteger(a) && a >= 0)) {
      return invalid('Every person needs a non-negative amount');
    }
    const sum = amounts.reduce<number>((acc, a) => acc + a, 0);
    if (sum !== total) return invalid('Amounts must add up to the bill', { total, sum });
    return ok(amounts);
  }

  const weights = participants.map((p) => p.percentBps);
  if (!weights.every((w): w is number => w !== undefined && Number.isInteger(w) && w >= 0)) {
    return invalid('Every person needs a percentage');
  }
  const sum = weights.reduce((acc, w) => acc + w, 0);
  if (sum !== 10_000) return invalid('Percentages must add up to 100', { sum });
  return ok(allocate(total, weights));
}

/**
 * Splits `total` between `participants`. Shares are exact integer paise and always add up to
 * the bill; in equal and percent modes the leftover paise go to the largest remainders,
 * ties to the earlier participant.
 */
export function computeSplit(
  total: Paise,
  participants: readonly SplitParticipant[],
  mode: SplitMode,
): Result<SplitPlan> {
  const problem = validateParticipants(total, participants);
  if (problem) return err(problem);

  const amounts = partsFor(mode, total, participants);
  if (!amounts.ok) return amounts;

  const parts = participants.map((p, i) => ({ ref: p.ref, share: amounts.value[i] as Paise }));
  const others = parts.filter((p) => p.ref !== 'self');
  if (others.some((p) => p.share < MIN_SHARE)) {
    return invalid(`Each share must be at least ${MIN_SHARE} paise`);
  }
  return ok({
    mode,
    total,
    parts,
    shares: others.map((p) => ({ contactId: p.ref as ContactId, share: p.share })),
    selfShare: paise(parts.filter((p) => p.ref === 'self').reduce((acc, p) => acc + p.share, 0)),
  });
}
