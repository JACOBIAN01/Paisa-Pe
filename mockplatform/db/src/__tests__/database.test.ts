import { createDatabase } from '../database';
import { createMemoryBackend, loadDatabase, saveDatabase } from '../persistence';
import { createRng } from '../rng';
import { seedDatabase, PRIMARY_USER_ID, PRIMARY_TXN_COUNT, CLUSTER_START } from '../seed';
import { istDayStart, istMonthStart } from '../ops/time';
import { postTxn } from '../ops/ledger';
import { issueSession, rotateSession } from '../ops/sessions';
import { userId } from '../ids';

const NOW = 1_760_000_000_000;

const seeded = (seed = 7) => {
  const db = createDatabase(seed);
  seedDatabase(db, NOW);
  return db;
};

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = createRng(1);
    const b = createRng(1);
    expect([a.next(), a.next(), a.int(1, 9)]).toEqual([b.next(), b.next(), b.int(1, 9)]);
    expect(createRng(2).next()).not.toBe(createRng(1).next());
  });
});

describe('seed fixtures', () => {
  it('creates the documented volumes', () => {
    const db = seeded();
    expect(db.t.users.size).toBe(8);
    expect(db.t.contacts.filter((c) => c.ownerId === PRIMARY_USER_ID)).toHaveLength(20);
    expect(db.t.txns.filter((t) => t.ownerId === PRIMARY_USER_ID)).toHaveLength(PRIMARY_TXN_COUNT);
    expect(db.t.coupons.filter((c) => c.ownerId === PRIMARY_USER_ID)).toHaveLength(12);
    expect(db.t.cards.filter((c) => c.ownerId === PRIMARY_USER_ID)).toHaveLength(1);
    expect(db.t.billers).toHaveLength(12);
  });

  it('is identical for the same seed and differs for another', () => {
    expect(seeded(7).snapshot()).toEqual(seeded(7).snapshot());
    expect(seeded(8).snapshot()).not.toEqual(seeded(7).snapshot());
  });

  it('keeps balances consistent with history and non-negative integers', () => {
    const db = seeded();
    for (const [id, wallet] of db.t.wallets) {
      const own = db.t.txns.filter((t) => t.ownerId === id);
      expect(Number.isInteger(wallet.balance)).toBe(true);
      expect(wallet.balance).toBeGreaterThanOrEqual(0);
      expect(own[own.length - 1]?.balanceAfter).toBe(wallet.balance);
      expect(own.every((t) => Number.isInteger(t.amount) && t.balanceAfter >= 0)).toBe(true);
    }
  });

  it('keeps seeded history out of the current IST day', () => {
    const db = seeded();
    const dayStart = istDayStart(NOW);
    expect(db.t.txns.every((t) => t.updatedAt < dayStart)).toBe(true);
  });

  it('places identical updatedAt values across the 50-row boundary', () => {
    const db = seeded();
    const own = db.t.txns.filter((t) => t.ownerId === PRIMARY_USER_ID);
    const boundary = own[CLUSTER_START + 2]?.updatedAt;
    expect(own[CLUSTER_START + 3]?.updatedAt).toBe(boundary);
    expect(own[CLUSTER_START]?.updatedAt).toBe(boundary);
    expect(own[49]?.updatedAt).toBe(own[50]?.updatedAt);
  });
});

describe('ledger and sessions', () => {
  it('moves the balance and bumps the version', () => {
    const db = seeded();
    const id = userId(PRIMARY_USER_ID);
    const before = { ...db.t.wallets.get(id)! };
    const txn = postTxn(db, NOW, { ownerId: id, type: 'p2p_send', amount: 10_000, fee: 100 });
    const after = db.t.wallets.get(id)!;
    expect(after.balance).toBe(before.balance - 10_100);
    expect(after.version).toBe(before.version + 1);
    expect(txn.balanceAfter).toBe(after.balance);
    expect(() =>
      postTxn(db, NOW, { ownerId: id, type: 'p2p_send', amount: after.balance + 1 }),
    ).toThrow();
  });

  it('issues strictly increasing stamps', () => {
    const db = seeded();
    const a = db.stamp(NOW);
    const b = db.stamp(NOW - 5000);
    expect(b).toBeGreaterThan(a);
  });

  it('rotates tokens and remembers the used refresh token', () => {
    const db = seeded();
    const session = issueSession(db, NOW, userId(PRIMARY_USER_ID), { name: 'Pixel' });
    const record = db.t.sessions.get(session.sessionId)!;
    const next = rotateSession(db, NOW + 1, record);
    expect(next.refreshToken).not.toBe(session.refreshToken);
    expect(db.t.usedRefresh.get(session.refreshToken)).toBe(session.sessionId);
    expect(db.t.accessIndex.has(session.accessToken)).toBe(false);
  });
});

describe('time and persistence', () => {
  it('computes IST day and month starts', () => {
    const ms = Date.UTC(2025, 2, 15, 20, 0, 0);
    expect(istDayStart(ms)).toBe(Date.UTC(2025, 2, 15, 18, 30, 0));
    expect(istMonthStart(Date.UTC(2025, 2, 31, 19, 0, 0))).toBe(Date.UTC(2025, 3, 1) - 19_800_000);
  });

  it('round-trips a snapshot through a backend', async () => {
    const db = seeded();
    const backend = createMemoryBackend();
    await saveDatabase(db, backend);
    const other = createDatabase(1);
    expect(await loadDatabase(other, backend)).toBe(true);
    expect(other.snapshot()).toEqual(db.snapshot());
    expect(await loadDatabase(createDatabase(1), createMemoryBackend())).toBe(false);
  });
});
