import { createMemoryBackend, withJson } from '@pp/core-storage';
import { createHttpClient } from '@pp/core-net';
import { PRIMARY_USER_ID } from '@pp/mock-db';
import { createManualClock, createMockServer } from '@pp/mock-server';
import { createCardsService } from '../index';

function setup() {
  const clock = createManualClock(Date.UTC(2025, 5, 1, 6, 0, 0));
  const server = createMockServer({ clock, seed: 7 });
  const token = server.admin.loginAs(PRIMARY_USER_ID, {
    name: 'Phone',
    platform: 'ios',
  }).accessToken;
  const http = createHttpClient({
    baseUrl: 'http://mock.local',
    fetch: server.fetch,
    getAccessToken: () => token,
    clock,
    retry: { maxAttempts: 1 },
  });
  const storage = withJson(createMemoryBackend());
  const cards = createCardsService({
    http,
    storage,
    clock,
    userId: PRIMARY_USER_ID,
    revealTtlMs: 10_000,
    schedule: () => () => undefined,
  });
  const first = server.db.t.cards.find((c) => c.ownerId === PRIMARY_USER_ID)!;
  const second = { ...first, card: { ...first.card, id: 'card_second' as never, last4: '4321' } };
  server.db.t.cards.push(second);
  return { clock, server, cards, storage, first: first.card.id, second: second.card.id };
}

describe('freeze and unfreeze', () => {
  it('shows the change immediately and confirms it with the server', async () => {
    const env = setup();
    await env.cards.refresh();
    const pending = env.cards.freeze(env.first);
    expect(env.cards.getCards().find((c) => c.id === env.first)?.status).toBe('frozen');
    await pending;
    expect(env.cards.getCards().find((c) => c.id === env.first)?.status).toBe('frozen');
    await env.cards.unfreeze(env.first);
    expect(env.cards.getCards().find((c) => c.id === env.first)?.status).toBe('active');
  });

  it('rolls back only its own change when the request fails', async () => {
    const env = setup();
    await env.cards.refresh();
    env.server.admin.failNext({ endpoint: 'cards.freeze', path: `/cards/${env.first}/freeze` }, 1);
    const failing = env.cards.freeze(env.first);
    const succeeding = env.cards.freeze(env.second);
    await expect(failing).rejects.toBeDefined();
    await succeeding;
    const status = (id: string) => env.cards.getCards().find((c) => c.id === id)?.status;
    expect(status(env.first)).toBe('active');
    expect(status(env.second)).toBe('frozen');
  });

  it('applies rapid toggles on one card in order', async () => {
    const env = setup();
    await env.cards.refresh();
    const a = env.cards.freeze(env.first);
    const b = env.cards.unfreeze(env.first);
    const c = env.cards.freeze(env.first);
    expect(env.cards.getCards().find((x) => x.id === env.first)?.status).toBe('frozen');
    await Promise.all([a, b, c]);
    expect(env.cards.getCards().find((x) => x.id === env.first)?.status).toBe('frozen');
    expect(env.server.db.t.cards.find((x) => x.card.id === env.first)?.card.status).toBe('frozen');
  });

  it('notifies subscribers and stops after unsubscribe', async () => {
    const env = setup();
    const seen = jest.fn();
    const off = env.cards.subscribe(seen);
    await env.cards.refresh();
    expect(seen).toHaveBeenCalled();
    off();
    seen.mockClear();
    await env.cards.freeze(env.first);
    expect(seen).not.toHaveBeenCalled();
  });
});

describe('reveal', () => {
  it('keeps details in memory until the ttl passes', async () => {
    const env = setup();
    await env.cards.reveal(env.first);
    expect(env.cards.getReveal(env.first)?.pan).toMatch(/^\d{16}$/);
    env.clock.advance(9_000);
    expect(env.cards.getReveal(env.first)).not.toBeNull();
    env.clock.advance(2_000);
    expect(env.cards.getReveal(env.first)).toBeNull();
  });

  it('is refused for a frozen card', async () => {
    const env = setup();
    await env.cards.freeze(env.first);
    await expect(env.cards.reveal(env.first)).rejects.toMatchObject({ code: 'card_frozen' });
  });

  it('freezing wipes details that are on screen', async () => {
    const env = setup();
    await env.cards.reveal(env.first);
    await env.cards.freeze(env.first);
    expect(env.cards.getReveal(env.first)).toBeNull();
  });

  it('never writes the number or cvv to storage', async () => {
    const env = setup();
    await env.cards.refresh();
    const { pan, cvv } = await env.cards.reveal(env.first);
    await new Promise((resolve) => setImmediate(resolve));
    const stored = await Promise.all(
      (await env.storage.keys()).map((key) => env.storage.getItem(key)),
    );
    const blob = stored.join('|');
    expect(blob).toContain('4321');
    expect(blob).not.toContain(pan);
    expect(blob).not.toContain(`"${cvv}"`);
  });

  it('dispose clears revealed details', async () => {
    const env = setup();
    await env.cards.reveal(env.first);
    env.cards.dispose();
    expect(env.cards.getReveal(env.first)).toBeNull();
  });

  it('rehydrates the cached list', async () => {
    const env = setup();
    await env.cards.refresh();
    await new Promise((resolve) => setImmediate(resolve));
    const fresh = createCardsService({
      http: { call: (() => Promise.reject(new Error('offline'))) as never },
      storage: env.storage,
      clock: env.clock,
      userId: PRIMARY_USER_ID,
    });
    await fresh.hydrate();
    expect(fresh.getCards()).toHaveLength(2);
  });
});
