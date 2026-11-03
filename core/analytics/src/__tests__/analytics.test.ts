import {
  appAnalytics,
  createAnalytics,
  createMemoryAnalyticsSink,
  defaultMemorySink,
  resetAnalyticsSink,
} from '../analytics';
import { amountBucket, paymentSentEvent, screenViewedEvent } from '../events';
import type { Paise } from '@pp/contracts-domain';

const p = (n: number) => n as Paise;

describe('amountBucket', () => {
  it.each([
    [9_999, '<100'],
    [10_000, '100-500'],
    [49_999, '100-500'],
    [50_000, '500-2000'],
    [200_000, '2000-10000'],
    [1_000_000, '10000+'],
  ])('%d paise -> %s', (amount, bucket) => {
    expect(amountBucket(p(amount))).toBe(bucket);
  });
});

describe('analytics', () => {
  it('sends typed events through the sink', () => {
    const sink = createMemoryAnalyticsSink();
    const analytics = createAnalytics({ sink });
    analytics.track('split_created', { participants: 3 });
    analytics.trackEvent(
      paymentSentEvent({ amountBucket: '<100', type: 'p2p_send', status: 'success' }),
    );
    analytics.trackEvent(screenViewedEvent('home'));
    expect(sink.events).toEqual([
      { name: 'split_created', props: { participants: 3 } },
      {
        name: 'payment_sent',
        props: { amountBucket: '<100', type: 'p2p_send', status: 'success' },
      },
      { name: 'screen_viewed', props: { route: 'home' } },
    ]);
  });

  it('strips non-primitive properties', () => {
    const sink = createMemoryAnalyticsSink();
    const analytics = createAnalytics({ sink });
    const props = { amountBucket: '<100', type: 'x', status: 'y', txn: { phone: '+919812345678' } };
    analytics.track('payment_sent', props as never);
    expect(sink.events[0]?.props).not.toHaveProperty('txn');
  });

  it('can be disabled and survives a failing sink', () => {
    const warn = jest.fn();
    const analytics = createAnalytics({
      sink: {
        send: () => {
          throw new Error('down');
        },
      },
      logger: { warn } as never,
    });
    expect(() => analytics.track('card_frozen', { frozen: true })).not.toThrow();
    expect(warn).toHaveBeenCalled();
    const sink = createMemoryAnalyticsSink();
    const off = createAnalytics({ sink });
    off.setEnabled(false);
    off.track('card_frozen', { frozen: true });
    expect(sink.events).toHaveLength(0);
  });

  it('appAnalytics writes to the default memory sink until reset', () => {
    appAnalytics.track('goal_created', { hasDeadline: true });
    expect(defaultMemorySink.events).toHaveLength(1);
    resetAnalyticsSink();
    expect(defaultMemorySink.events).toHaveLength(0);
  });
});
