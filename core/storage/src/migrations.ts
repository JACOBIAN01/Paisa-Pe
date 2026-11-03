import type { JsonStore } from './types';

export const SCHEMA_VERSION_KEY = '__schema_version';

export interface Migration {
  version: number;
  up(storage: JsonStore): Promise<void>;
}

export interface MigrationReport {
  from: number;
  to: number;
  applied: number[];
}

const running = new WeakMap<JsonStore, Promise<MigrationReport>>();

async function migrate(
  storage: JsonStore,
  migrations: readonly Migration[],
): Promise<MigrationReport> {
  const sorted = [...migrations].sort((a, b) => a.version - b.version);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i]?.version === sorted[i - 1]?.version) {
      throw new Error(`duplicate migration version ${sorted[i]?.version}`);
    }
  }
  const stored = await storage.getJSON<number>(SCHEMA_VERSION_KEY);
  const from = typeof stored === 'number' ? stored : 0;
  const applied: number[] = [];
  let current = from;
  for (const migration of sorted) {
    if (migration.version <= current) continue;
    await migration.up(storage);
    await storage.setJSON(SCHEMA_VERSION_KEY, migration.version);
    current = migration.version;
    applied.push(migration.version);
  }
  return { from, to: current, applied };
}

/** Applies pending migrations in order, persisting the version after each one. */
export function runMigrations(
  storage: JsonStore,
  migrations: readonly Migration[],
): Promise<MigrationReport> {
  const existing = running.get(storage);
  if (existing) return existing;
  const run = migrate(storage, migrations).finally(() => running.delete(storage));
  running.set(storage, run);
  return run;
}
