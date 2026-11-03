import type { Card } from '@pp/contracts-domain';
import { CARDS_SERVICE } from '@pp/svc-cards';
import { BILLS_SERVICE } from '@pp/svc-bills';
import { createTestApp, type TestApp } from '../index';
import { balanceOf, ensureBalance } from './money-support';

let app: TestApp;

beforeEach(async () => {
  app = await createTestApp();
  ensureBalance(app, 500_000);
});

afterEach(() => {
  app.dispose();
});

describe('scenario 22: virtual card', () => {
  it('freezes and unfreezes, and refuses to reveal details while frozen', async () => {
    const cards = app.container.resolve(CARDS_SERVICE);
    const [card] = (await cards.refresh()) as Card[];
    expect(card?.status).toBe('active');
    const id = (card as Card).id;

    const revealed = await cards.reveal(id);
    expect(revealed.pan).toMatch(/^\d{16}$/);
    expect(cards.getReveal(id)).not.toBeNull();
    cards.hideReveal(id);
    expect(cards.getReveal(id)).toBeNull();

    const frozen = await cards.freeze(id);
    expect(frozen.status).toBe('frozen');
    expect(cards.getCards()[0]?.status).toBe('frozen');
    await expect(cards.reveal(id)).rejects.toMatchObject({ code: 'card_frozen' });
    expect(cards.getReveal(id)).toBeNull();

    const thawed = await cards.unfreeze(id);
    expect(thawed.status).toBe('active');
    await expect(cards.reveal(id)).resolves.toMatchObject({ pan: expect.any(String) });
  });
});

describe('scenario 23: bill payment', () => {
  it('pays a due with several line items and the app total matches what was booked', async () => {
    const bills = app.container.resolve(BILLS_SERVICE);
    const dues = await bills.dues();
    const due = dues.find((d) => d.items.length >= 2);
    expect(due).toBeDefined();
    const expected = bills.totalFor(due as NonNullable<typeof due>);
    const before = balanceOf(app);

    const payment = await bills.pay(due as NonNullable<typeof due>);

    expect(payment.comparison.matches).toBe(true);
    expect(payment.txn.amount).toBe(expected.subtotal);
    expect(payment.txn.fee).toBe(expected.fee);
    expect(balanceOf(app)).toBe(before - expected.total);
  });
});
