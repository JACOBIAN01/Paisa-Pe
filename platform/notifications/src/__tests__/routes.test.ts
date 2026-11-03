import { validateNotificationRoute } from '../routes';

describe('validateNotificationRoute', () => {
  it('accepts safe routes with valid params', () => {
    expect(validateNotificationRoute({ name: 'txn-detail', params: { id: 't1' } })).toEqual({
      name: 'txn-detail',
      params: { id: 't1' },
    });
    expect(validateNotificationRoute({ name: 'rewards' })).toEqual({ name: 'rewards', params: {} });
  });

  it.each([
    [{ name: 'send-confirm', params: { to: '+919812345678', amount: '100' } }],
    [{ name: 'send' }],
    [{ name: 'bills' }],
    [{ name: 'qr-scan' }],
    [{ name: 'unknown' }],
    [{ name: 'constructor' }],
    [{ name: 'txn-detail' }],
    [{ name: 'home', params: { extra: '1' } }],
  ])('rejects %j', (ref) => {
    expect(validateNotificationRoute(ref)).toBeNull();
  });
});
