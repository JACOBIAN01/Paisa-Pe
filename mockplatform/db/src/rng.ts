export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  weighted<T>(entries: ReadonlyArray<readonly [T, number]>): T;
}

/** One mulberry32 step: pure, so the state can live in persisted metadata. */
export function mulberry32(state: number): { state: number; value: number } {
  const s = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { state: s, value: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
}

export function createRng(seed: number): Rng {
  let state = seed | 0;
  const next = (): number => {
    const step = mulberry32(state);
    state = step.state;
    return step.value;
  };
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    chance: (p) => next() < p,
    pick: <T>(items: readonly T[]): T => items[int(0, items.length - 1)] as T,
    weighted: <T>(entries: ReadonlyArray<readonly [T, number]>): T => {
      const total = entries.reduce((sum, [, w]) => sum + w, 0);
      let roll = next() * total;
      for (const [item, weight] of entries) {
        roll -= weight;
        if (roll < 0) return item;
      }
      return (entries[entries.length - 1] as readonly [T, number])[0];
    },
  };
}
