import { CLUSTER_LENGTH, CLUSTER_START, PRIMARY_TXN_COUNT } from '@pp/mock-db';
import { DIYA_PHONE, PRIMARY, login, setBalance, setup } from './helpers';

type Row = { id: string; updatedAt: number };
type Api = ReturnType<typeof login>['api'];

function drain(api: Api, from?: string): { items: Row[]; cursor: string | undefined } {
  const items: Row[] = [];
  let cursor = from;
  for (;;) {
    const res = api.get(`/sync/delta?limit=100${cursor ? `&cursor=${cursor}` : ''}`);
    items.push(...res.body.items);
    cursor = res.body.nextCursor ?? cursor;
    if (!res.body.hasMore) return { items, cursor };
  }
}

describe('delta sync', () => {
  it('pages every row exactly once even when updatedAt values tie across a page boundary', () => {
    const { server } = setup();
    const { api } = login(server);
    const seen: Row[] = [];
    const pages: Row[][] = [];
    let cursor: string | undefined;
    do {
      const res = api.get(`/sync/delta?limit=50${cursor ? `&cursor=${cursor}` : ''}`);
      pages.push(res.body.items);
      seen.push(...res.body.items);
      cursor = res.body.hasMore ? res.body.nextCursor : undefined;
    } while (cursor);
    expect(seen).toHaveLength(PRIMARY_TXN_COUNT);
    expect(new Set(seen.map((r) => r.id)).size).toBe(PRIMARY_TXN_COUNT);
    expect(pages[0]).toHaveLength(50);
    expect(pages[0]!.at(-1)!.updatedAt).toBe(pages[1]![0]!.updatedAt);
    const tied = seen.filter((r) => r.updatedAt === seen[CLUSTER_START]!.updatedAt);
    expect(tied).toHaveLength(CLUSTER_LENGTH);
  });

  it('is ordered by (updatedAt, id)', () => {
    const { server } = setup();
    const { api } = login(server);
    const items: Row[] = api.get('/sync/delta?limit=200').body.items;
    for (let i = 1; i < items.length; i += 1) {
      const [a, b] = [items[i - 1]!, items[i]!];
      expect(a.updatedAt < b.updatedAt || (a.updatedAt === b.updatedAt && a.id < b.id)).toBe(true);
    }
  });

  it('returns only new and changed rows after a cursor, and null when caught up', () => {
    const { server } = setup();
    const { api } = login(server);
    setBalance(server, PRIMARY, 1_000_000);
    const cursor = drain(api).cursor as string;
    const idle = api.get(`/sync/delta?cursor=${cursor}`);
    expect(idle.body).toMatchObject({ items: [], nextCursor: null, hasMore: false });
    const sent = api.keyed('/transfers', { to: { phone: DIYA_PHONE }, amount: 5000 }, 'k').body.txn;
    const next = api.get(`/sync/delta?cursor=${cursor}`);
    expect(next.body.items.map((t: Row) => t.id)).toEqual([sent.id]);
    server.admin.receivePayment(PRIMARY, 'usr_002', 7000);
    expect(api.get(`/sync/delta?cursor=${next.body.nextCursor}`).body.items).toHaveLength(1);
  });

  it('stays monotonic under negative clock skew', () => {
    const { server } = setup();
    const { api } = login(server);
    setBalance(server, PRIMARY, 1_000_000);
    const first = api.keyed('/transfers', { to: { phone: DIYA_PHONE }, amount: 100 }, 'a').body.txn;
    server.admin.setClockSkew(-3_600_000);
    const second = api.keyed('/transfers', { to: { phone: DIYA_PHONE }, amount: 100 }, 'b').body
      .txn;
    expect(second.updatedAt).toBeGreaterThan(first.updatedAt);
    const after = drain(api).items.map((t) => t.id);
    expect(after.slice(-2)).toEqual([first.id, second.id]);
  });

  it('rejects malformed cursors and out-of-range limits', () => {
    const { server } = setup();
    const { api } = login(server);
    expect(api.get('/sync/delta?cursor=!!').status).toBe(400);
    expect(api.get('/sync/delta?limit=0').status).toBe(400);
    expect(api.get('/sync/delta?limit=500').status).toBe(400);
  });
});

describe('push', () => {
  const ids = (server: ReturnType<typeof setup>['server']) =>
    server.admin.listTxns(PRIMARY).map((t) => t.id);

  it('applies edits in receipt order and ignores client timestamps', () => {
    const { server } = setup();
    const { api } = login(server);
    const [a, b] = ids(server);
    const res = api.post('/sync/push', {
      edits: [
        { txnId: a, note: 'first', clientUpdatedAt: 9_999_999_999_999 },
        { txnId: a, note: 'second', clientUpdatedAt: 1 },
        { txnId: b, note: 'other', clientUpdatedAt: 5 },
        { txnId: 'txn_missing', note: 'x', clientUpdatedAt: 5 },
      ],
    });
    expect(res.body.rejected).toEqual(['txn_missing']);
    expect(res.body.applied.map((t: { id: string; note: string }) => [t.id, t.note])).toEqual([
      [a, 'second'],
      [b, 'other'],
    ]);
  });

  it('bumps updatedAt only when the note changes, and the change shows up in delta', () => {
    const { server } = setup();
    const { api } = login(server);
    const last = server.admin.listTxns(PRIMARY).at(-1)!;
    const cursor = drain(api).cursor as string;
    const same = api.post('/sync/push', {
      edits: [{ txnId: last.id, note: last.note ?? '', clientUpdatedAt: 1 }],
    });
    expect(same.body.applied).toHaveLength(1);
    const changed = api.post('/sync/push', {
      edits: [{ txnId: last.id, note: 'edited', clientUpdatedAt: 1 }],
    });
    expect(changed.body.applied[0].updatedAt).toBeGreaterThan(last.updatedAt);
    const delta = api.get(`/sync/delta?cursor=${cursor}`).body.items;
    expect(delta.map((t: { id: string; note: string }) => [t.id, t.note])).toContainEqual([
      last.id,
      'edited',
    ]);
  });

  it("cannot edit another user's transactions", () => {
    const { server } = setup();
    const { api } = login(server);
    const foreign = server.admin.listTxns('usr_002')[0]!.id;
    const res = api.post('/sync/push', {
      edits: [{ txnId: foreign, note: 'x', clientUpdatedAt: 1 }],
    });
    expect(res.body).toEqual({ applied: [], rejected: [foreign] });
  });
});
