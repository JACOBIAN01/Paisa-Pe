import { paise } from '@pp/core-money';
import { AUTH_SERVICE } from '@pp/svc-auth';
import { LEDGER } from '@pp/svc-ledger';
import { TRANSFER_SERVICE } from '@pp/svc-transfers';
import { recordEvents } from '../emitters';
import { createTestApp, phoneOf, type TestApp } from '../scenarios/test-app';

let app: TestApp;
afterEach(() => app?.dispose());

describe('createTestApp', () => {
  it('signs in through the OTP flow and exposes the active user container', async () => {
    app = await createTestApp();
    expect(app.userId()).toBe('usr_001');
    expect(app.container.resolve(AUTH_SERVICE).getState().accounts).toHaveLength(1);
    expect(app.container.has(LEDGER)).toBe(true);
  });

  it('can start signed out and sign in later', async () => {
    app = await createTestApp({ loggedIn: false });
    expect(app.userId()).toBeNull();
    expect(app.container.has(LEDGER)).toBe(false);
    await app.login('usr_002');
    expect(app.userId()).toBe('usr_002');
    expect(app.container.has(LEDGER)).toBe(true);
  });

  it('sends a transfer through the transfer service against the mock server', async () => {
    app = await createTestApp();
    const recorder = recordEvents();
    app.admin.credit('usr_001', 500_000);
    const transfers = app.container.resolve(TRANSFER_SERVICE);
    const intent = await transfers.createIntent({
      to: { phone: phoneOf('usr_002') as never },
      amount: paise(25_000),
    });
    const outcome = await transfers.send(intent.id);
    expect(outcome.status).toBe('sent');
    expect(recorder.count('payment.sent')).toBe(1);
    expect(app.admin.countTransfersWithKey('usr_001', intent.key)).toBe(1);
    recorder.stop();
  });

  it('keeps user containers separate when switching accounts', async () => {
    app = await createTestApp();
    const first = app.container.resolve(LEDGER);
    await app.login('usr_002');
    expect(app.userId()).toBe('usr_002');
    expect(app.container.resolve(LEDGER)).not.toBe(first);
  });

  it('fails requests while offline', async () => {
    app = await createTestApp();
    app.setOnline(false);
    await expect(app.http.call('wallet.balance')).rejects.toMatchObject({ code: 'network' });
    app.setOnline(true);
    await expect(app.http.call('wallet.balance')).resolves.toBeDefined();
  });
});
