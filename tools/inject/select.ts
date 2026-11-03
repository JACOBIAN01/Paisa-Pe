export type Tier = 1 | 2 | 3;

export interface BugEntry {
  id: string;
  tier: Tier;
  touches: string[];
  conflicts?: string[];
  /** Pairs designed to chain; only selected together with `chain`. */
  chains?: string[];
}

export interface Manifest {
  bugs: BugEntry[];
}

export interface SelectOptions {
  seed?: number;
  count?: number;
  only?: string[];
  exclude?: string[];
  chain?: boolean;
  /** Per-tier quota used for the default cohort mix. */
  quota?: Record<Tier, number>;
}

export const DEFAULT_QUOTA: Record<Tier, number> = { 1: 4, 2: 5, 3: 6 };

/** mulberry32: small deterministic PRNG so a seed always yields the same cohort. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

export function conflictsBetween(a: BugEntry, b: BugEntry, chain: boolean): boolean {
  if (a.conflicts?.includes(b.id) || b.conflicts?.includes(a.id)) return true;
  const chained = a.chains?.includes(b.id) || b.chains?.includes(a.id);
  return Boolean(chained) && !chain;
}

export function findConflicts(bugs: BugEntry[], chain: boolean): [string, string][] {
  const pairs: [string, string][] = [];
  bugs.forEach((a, i) => {
    for (const b of bugs.slice(i + 1)) {
      if (conflictsBetween(a, b, chain)) pairs.push([a.id, b.id]);
    }
  });
  return pairs;
}

function assertKnown(manifest: Manifest, ids: string[]): void {
  const known = new Set(manifest.bugs.map((b) => b.id));
  const missing = ids.filter((id) => !known.has(id));
  if (missing.length > 0) throw new Error(`unknown bug ids: ${missing.join(', ')}`);
}

/**
 * Picks the bugs to apply. `only` is explicit and must be conflict-free; otherwise a seeded
 * shuffle fills the per-tier quota (scaled to `count`) while skipping conflicting picks.
 */
export function selectBugs(manifest: Manifest, options: SelectOptions = {}): BugEntry[] {
  const { seed = 1, only, exclude = [], chain = false } = options;
  assertKnown(manifest, [...(only ?? []), ...exclude]);
  const byId = new Map(manifest.bugs.map((b) => [b.id, b]));

  if (only && only.length > 0) {
    const chosen = only.map((id) => byId.get(id) as BugEntry);
    const clash = findConflicts(chosen, chain);
    if (clash.length > 0) {
      throw new Error(`conflicting bugs requested: ${clash.map((p) => p.join('+')).join(', ')}`);
    }
    return chosen;
  }

  const quota = scaleQuota(options.quota ?? DEFAULT_QUOTA, options.count);
  const rand = createRng(seed);
  const chosen: BugEntry[] = [];
  for (const tier of [1, 2, 3] as const) {
    const pool = shuffle(
      manifest.bugs.filter((b) => b.tier === tier && !exclude.includes(b.id)),
      rand,
    );
    let taken = 0;
    for (const bug of pool) {
      if (taken >= quota[tier]) break;
      if (chosen.some((c) => conflictsBetween(c, bug, chain))) continue;
      chosen.push(bug);
      taken += 1;
    }
  }
  return chosen.sort((a, b) => a.id.localeCompare(b.id));
}

function scaleQuota(base: Record<Tier, number>, count?: number): Record<Tier, number> {
  const total = base[1] + base[2] + base[3];
  if (count === undefined || count === total) return base;
  const scaled = {
    1: Math.round((base[1] * count) / total),
    2: Math.round((base[2] * count) / total),
    3: Math.round((base[3] * count) / total),
  } as Record<Tier, number>;
  scaled[3] += count - (scaled[1] + scaled[2] + scaled[3]);
  return scaled;
}
