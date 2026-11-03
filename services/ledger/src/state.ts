import type { PendingDelta, LedgerState } from './types';

export const emptyState = (): LedgerState => ({
  serverBalance: 0,
  version: -1,
  asOf: 0,
  baseline: null,
  entries: {},
  pending: [],
  stale: true,
  fetchedAt: 0,
});

export const sumPending = (pending: readonly PendingDelta[]): number =>
  pending.reduce((total, p) => total + p.delta, 0);

export function parseState(raw: unknown): LedgerState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const s = raw as Partial<LedgerState>;
  if (typeof s.serverBalance !== 'number' || typeof s.version !== 'number') return null;
  return { ...emptyState(), ...s, entries: s.entries ?? {}, pending: s.pending ?? [] };
}
