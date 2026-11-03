import type { Contact, Limits, Paise, Phone, RiskPrompt, Txn } from '@pp/contracts-domain';
import { hasPaidBefore, medianRecentSend } from './history';
import { DEFAULT_THRESHOLDS, type RiskThresholds } from './thresholds';

export interface AssessTransferInput {
  amount: Paise;
  recipient: { phone: Phone };
  history: readonly Txn[];
  contacts?: readonly Contact[];
  limits?: Limits;
  thresholds?: Partial<RiskThresholds>;
}

const SEVERITY_ORDER: Record<RiskPrompt['severity'], number> = { block: 0, warn: 1, info: 2 };

const rupees = (value: number): string => `₹${(value / 100).toFixed(2)}`;

/** Pure and deterministic: same input, same prompts, most severe first. */
export function assessTransfer(input: AssessTransferInput): RiskPrompt[] {
  const limits = { ...DEFAULT_THRESHOLDS, ...input.thresholds };
  const prompts: RiskPrompt[] = [];

  if (input.limits) {
    const remaining = Math.max(input.limits.daily.limit - input.limits.daily.used, 0);
    if (input.amount > input.limits.perTxn) {
      prompts.push({
        kind: 'large_amount',
        severity: 'block',
        message: `The most you can send in one payment is ${rupees(input.limits.perTxn)}.`,
      });
    } else if (input.amount > remaining) {
      prompts.push({
        kind: 'large_amount',
        severity: 'block',
        message: `Only ${rupees(remaining)} is left of today's limit.`,
      });
    }
  }

  if (prompts.length === 0 && input.amount >= limits.largeAmount) {
    prompts.push({
      kind: 'large_amount',
      severity: 'warn',
      message: `You are sending ${rupees(input.amount)}. Check the details before you continue.`,
    });
  }

  const median = medianRecentSend(input.history, limits.sampleSize, limits.minSamples);
  if (median !== null && median > 0 && input.amount > median * limits.unusualMultiple) {
    prompts.push({
      kind: 'unusual_amount',
      severity: 'warn',
      message: `This is much more than your usual payment of about ${rupees(median)}.`,
    });
  }

  if (!hasPaidBefore(input.recipient.phone, input.history, input.contacts)) {
    prompts.push({
      kind: 'new_payee',
      severity: 'info',
      message: 'You have not paid this person before.',
    });
  }

  return prompts
    .map((prompt, index) => ({ prompt, index }))
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.prompt.severity] - SEVERITY_ORDER[b.prompt.severity] || a.index - b.index,
    )
    .map(({ prompt }) => prompt);
}

export const hasBlocker = (prompts: readonly RiskPrompt[]): boolean =>
  prompts.some((p) => p.severity === 'block');
