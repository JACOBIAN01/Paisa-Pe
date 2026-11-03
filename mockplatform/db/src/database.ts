import { mulberry32 } from './rng';
import type { DbMeta, DbTables, TableName } from './types';

export interface DbSnapshot {
  meta: DbMeta;
  tables: Record<string, unknown>;
}

export interface Database {
  t: DbTables;
  meta: DbMeta;
  /** Sequential, zero-padded ids so lexical order equals creation order. */
  nextId(prefix: string): string;
  /** Strictly increasing timestamp: never earlier than any stamp already issued. */
  stamp(now: number): number;
  random(): number;
  randomHex(length: number): string;
  snapshot(): DbSnapshot;
  restore(snapshot: DbSnapshot): void;
}

const emptyTables = (): DbTables => ({
  users: new Map(),
  wallets: new Map(),
  contacts: [],
  txns: [],
  requests: [],
  splits: [],
  coupons: [],
  scratchCards: [],
  cashbacks: [],
  goals: [],
  cards: [],
  billers: [],
  dues: [],
  autopay: [],
  notifications: [],
  preferences: new Map(),
  devices: new Map(),
  sessions: new Map(),
  accessIndex: new Map(),
  refreshIndex: new Map(),
  usedRefresh: new Map(),
  otps: new Map(),
  idempotency: new Map(),
});

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function encodeTable(value: unknown): unknown {
  return value instanceof Map ? { __map: Array.from(value.entries()) } : value;
}

function decodeTable(value: unknown): unknown {
  const marker = value as { __map?: Array<[unknown, unknown]> };
  return marker && typeof marker === 'object' && marker.__map ? new Map(marker.__map) : value;
}

export function createDatabase(seed: number): Database {
  const db: Database = {
    t: emptyTables(),
    meta: { seed, rngState: seed ^ 0x9e3779b9, lastStamp: 0, counters: {} },
    nextId(prefix) {
      const next = (db.meta.counters[prefix] ?? 0) + 1;
      db.meta.counters[prefix] = next;
      return `${prefix}_${String(next).padStart(6, '0')}`;
    },
    stamp(now) {
      const next = Math.max(now, db.meta.lastStamp + 1);
      db.meta.lastStamp = next;
      return next;
    },
    random() {
      const step = mulberry32(db.meta.rngState);
      db.meta.rngState = step.state;
      return step.value;
    },
    randomHex(length) {
      let out = '';
      while (out.length < length)
        out += Math.floor(db.random() * 0x100000000)
          .toString(16)
          .padStart(8, '0');
      return out.slice(0, length);
    },
    snapshot() {
      const tables: Record<string, unknown> = {};
      for (const name of Object.keys(db.t) as TableName[]) tables[name] = encodeTable(db.t[name]);
      return clone({ meta: db.meta, tables });
    },
    restore(snapshot) {
      const source = clone(snapshot);
      const next = emptyTables() as unknown as Record<string, unknown>;
      for (const name of Object.keys(next)) {
        if (name in source.tables) next[name] = decodeTable(source.tables[name]);
      }
      db.t = next as unknown as DbTables;
      db.meta = source.meta;
    },
  };
  return db;
}
