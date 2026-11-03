export interface RetryPolicy {
  /** Total attempts including the first. 1 disables retries. */
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  /** Fraction (0..1) of the delay that is randomised. */
  jitter: number;
}

export const DEFAULT_RETRY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 300,
  maxDelayMs: 5_000,
  jitter: 0.5,
};

/**
 * Delay before the next attempt, given how many attempts of *this call* have failed so far
 * (1 after the first failure). Pure: depends only on its arguments.
 */
export function backoffDelay(
  failedAttempts: number,
  policy: RetryPolicy,
  rand: () => number = Math.random,
): number {
  const exponent = Math.max(0, failedAttempts - 1);
  const ceiling = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** exponent);
  const jitter = Math.min(1, Math.max(0, policy.jitter));
  return Math.round(ceiling * (1 - jitter + jitter * rand()));
}
