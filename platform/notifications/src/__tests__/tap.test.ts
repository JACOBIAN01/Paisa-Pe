import { createMemorySink, resetSink, setSink } from '@pp/core-logging';
import { handleNotificationTap } from '../tap';
import { tap } from './helpers';

beforeEach(() => setSink(createMemorySink()));
afterEach(() => resetSink());

describe('handleNotificationTap', () => {
  it('routes a valid payload and emits the event', () => {
    const navigate = jest.fn();
    const bus = { emit: jest.fn() };
    const ok = handleNotificationTap(
      tap('n1', { name: 'goal-detail', params: { id: 'g1' } }),
      navigate,
      bus,
    );
    expect(ok).toBe(true);
    expect(navigate).toHaveBeenCalledWith('goal-detail', { id: 'g1' });
    expect(bus.emit).toHaveBeenCalledWith('notification.tapped', { id: 'n1' });
  });

  it.each([
    ['pay route', { name: 'send-confirm', params: { to: '+919812345678', amount: '9999' } }],
    ['missing route', undefined],
    ['non-object', 'send-confirm'],
    ['params with non-strings', { name: 'txn-detail', params: { id: 5 } }],
    ['unknown name', { name: 'admin' }],
  ])('drops %s', (_n, route) => {
    const navigate = jest.fn();
    const bus = { emit: jest.fn() };
    expect(handleNotificationTap(tap('n2', route), navigate, bus)).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(bus.emit).not.toHaveBeenCalled();
  });
});
