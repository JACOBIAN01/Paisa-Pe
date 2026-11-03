import type { Paise } from '@pp/contracts-domain';

export type MoveKind = 'deposit' | 'withdraw';

export const PREVIEW_MONTHS = [3, 6, 12] as const;
export const PREVIEW_DEBOUNCE_MS = 400;
export const GOAL_EMOJIS = ['🎯', '🏝️', '🏠', '📱', '🚗', '🎓'] as const;

/** Identifies what is being sent, so an edited amount never reuses an old intent id. */
export const moveSignature = (kind: MoveKind, amount: Paise): string => `${kind}:${amount}`;

export const isValidGoalName = (name: string): boolean => name.trim().length >= 2;
