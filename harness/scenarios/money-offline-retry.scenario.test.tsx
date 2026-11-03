import { paise } from '@pp/core-money';
import type { IdempotencyKey } from '@pp/contracts-domain';
import { TRANSFER_SERVICE } from '@pp/svc-transfers';
import { chaosControls, createTestApp, phoneOf, recordEvents, type TestApp } from '../index';
import { balanceOf, ensureBalance, sendsOf } from './money-support';

// Past the retry backoff, well inside the server's 30s idempotency window.
const BACKOFF_PASSES_MS = 10_000;

let app: TestApp;

beforeEach(async () => {
  app = await createTestApp();
  ensureBalance(app, 500_000);
});

afterEach(() => {
  app.dispose();
});

const newIntent = (amount: number) =>
  app.container.resolve(TRANSFER_SERVICE).createIntent({
    to: { phone: phoneOf('usr_002') as never },
    amount: paise(amount),
  });

describe('scenario 15: offline queue', () => {
  it('queues a send while offline and delivers it exactly once when the network returns', async () => {
    const transfers = app.container.resolve(TRANSFER_SERVICE);
    const events = recordEvents();
    const before = balanceOf(app);
    const sendsBefore = sendsOf(app).length;

    app.setOnline(false);
    const intent = await newIntent(30_000);
    const outcome = await transfers.send(intent.id);
    expect(outcome.status).toBe('queued');
    expect(await transfers.pendingCount()).toBe(1);
    expect(balanceOf(app)).toBe(before);

    app.setOnline(true);
    await app.clock.tick(BACKOFF_PASSES_MS);
    const report = await transfers.flushQueue();
    expect(report.remaining).toBe(0);
    expect(await transfers.pendingCount()).toBe(0);

    expect(sendsOf(app)).toHaveLength(sendsBefore + 1);
    expect(balanceOf(app)).toBe(before - 30_000);
    expect(app.admin.countTransfersWithKey('usr_001', intent.key as IdempotencyKey)).toBe(1);

    await transfers.flushQueue();
    expect(sendsOf(app)).toHaveLength(sendsBefore + 1);
    events.stop();
  });
});

describe('scenario 16: lost response then retry', () => {
  it('re-sends with the same idempotency key and debits exactly once', async () => {
    const transfers = app.container.resolve(TRANSFER_SERVICE);
    const controls = chaosControls(app.chaos);
    const before = balanceOf(app);
    const intent = await newIntent(45_000);

    controls.dropResponse('transfers.send');
    const first = await transfers.send(intent.id);
    expect(['queued', 'unknown']).toContain(first.status);
    // The server processed it even though the client never heard back.
    expect(app.admin.countTransfersWithKey('usr_001', intent.key as IdempotencyKey)).toBe(1);

    await app.clock.tick(BACKOFF_PASSES_MS);
    await transfers.flushQueue();
    const settled = transfers.getIntent(intent.id);
    expect(settled?.key).toBe(intent.key);
    expect(settled?.status).toBe('sent');
    expect(await transfers.pendingCount()).toBe(0);

    expect(app.admin.countTransfersWithKey('usr_001', intent.key as IdempotencyKey)).toBe(1);
    expect(balanceOf(app)).toBe(before - 45_000);
  });
});
