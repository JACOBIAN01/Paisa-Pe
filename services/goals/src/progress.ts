import type { Goal, Paise } from '@pp/contracts-domain';
import { paise } from '@pp/core-money';

export interface GoalProgress {
  /** 0..10_000 basis points of the target. */
  progressBps: number;
  remaining: Paise;
  reached: boolean;
}

export function goalProgress(goal: Pick<Goal, 'saved' | 'target'>): GoalProgress {
  const ratio = (BigInt(goal.saved) * 10_000n) / BigInt(Math.max(goal.target, 1));
  const progressBps = Number(ratio > 10_000n ? 10_000n : ratio);
  return {
    progressBps,
    remaining: paise(Math.max(goal.target - goal.saved, 0)),
    reached: goal.saved >= goal.target,
  };
}

/** Whole months from `now` to `deadline`, rounded up; null when there is no future deadline. */
export function monthsUntil(deadline: number | undefined, now: number): number | null {
  if (deadline === undefined || deadline <= now) return null;
  return Math.ceil((deadline - now) / (30 * 24 * 60 * 60 * 1000));
}

/** Monthly deposit, rounded up, needed to hit the target by the deadline. */
export function monthlyNeeded(goal: Goal, now: number): Paise | null {
  const months = monthsUntil(goal.deadline, now);
  if (months === null) return null;
  const remaining = Math.max(goal.target - goal.saved, 0);
  return paise(Math.ceil(remaining / months));
}
