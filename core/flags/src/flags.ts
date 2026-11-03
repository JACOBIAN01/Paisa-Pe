export type FlagValues = Record<string, boolean>;

export interface Flags<F extends FlagValues> {
  get<K extends keyof F>(key: K): F[K];
  /** Local override; wins over remote values and defaults until cleared. */
  set<K extends keyof F>(key: K, value: F[K]): void;
  clearOverrides(): void;
  /** Remote-config style update. Unknown keys are ignored. */
  applyRemote(values: Partial<F>): void;
  subscribe(listener: (changed: Array<keyof F>) => void): () => void;
  snapshot(): F;
}

export function createFlags<F extends FlagValues>(defaults: F): Flags<F> {
  let remote: Partial<F> = {};
  let overrides: Partial<F> = {};
  const listeners = new Set<(changed: Array<keyof F>) => void>();

  const read = <K extends keyof F>(key: K): F[K] =>
    (overrides[key] ?? remote[key] ?? defaults[key]) as F[K];

  const snapshot = (): F => {
    const out = { ...defaults };
    for (const key of Object.keys(defaults) as Array<keyof F>) out[key] = read(key);
    return out;
  };

  const notify = (before: F): void => {
    const after = snapshot();
    const changed = (Object.keys(defaults) as Array<keyof F>).filter(
      (key) => before[key] !== after[key],
    );
    if (changed.length === 0) return;
    for (const listener of [...listeners]) listener(changed);
  };

  return {
    get: read,
    snapshot,
    set(key, value) {
      const before = snapshot();
      overrides = { ...overrides, [key]: value };
      notify(before);
    },
    clearOverrides() {
      const before = snapshot();
      overrides = {};
      notify(before);
    },
    applyRemote(values) {
      const before = snapshot();
      const known: Partial<F> = {};
      for (const key of Object.keys(values) as Array<keyof F>) {
        if (key in defaults && values[key] !== undefined) known[key] = values[key];
      }
      remote = { ...remote, ...known };
      notify(before);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
