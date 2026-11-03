import type { Logger } from '@pp/core-logging';
import type { AnalyticsEvent, AnalyticsEventMap, AnalyticsEventName } from './events';

export interface AnalyticsSink {
  send(event: { name: string; props: Record<string, string | number | boolean> }): void;
}

export interface MemoryAnalyticsSink extends AnalyticsSink {
  events: Array<{ name: string; props: Record<string, string | number | boolean> }>;
  clear(): void;
}

export const createMemoryAnalyticsSink = (): MemoryAnalyticsSink => {
  const events: MemoryAnalyticsSink['events'] = [];
  return {
    events,
    send: (event) => {
      events.push(event);
    },
    clear: () => {
      events.length = 0;
    },
  };
};

export interface Analytics {
  track<N extends AnalyticsEventName>(name: N, props: AnalyticsEventMap[N]): void;
  trackEvent(event: AnalyticsEvent): void;
  setEnabled(enabled: boolean): void;
}

export interface AnalyticsOptions {
  sink: AnalyticsSink;
  logger?: Logger;
}

type Primitive = string | number | boolean;

/** Drops anything that is not a primitive so objects can never leak into a sink. */
function sanitise(props: object): Record<string, Primitive> {
  const out: Record<string, Primitive> = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    }
  }
  return out;
}

export function createAnalytics({ sink, logger }: AnalyticsOptions): Analytics {
  let enabled = true;

  const send = (name: string, props: object): void => {
    if (!enabled) return;
    try {
      sink.send({ name, props: sanitise(props) });
    } catch (error) {
      logger?.warn('analytics sink failed', { name, error });
    }
  };

  return {
    track: (name, props) => send(name, props),
    trackEvent: (event) => send(event.name, event.props),
    setEnabled: (value) => {
      enabled = value;
    },
  };
}

const defaultSink = createMemoryAnalyticsSink();
let activeSink: AnalyticsSink = defaultSink;

/** Process-wide analytics. Defaults to an in-memory sink until the app installs a real one. */
export const appAnalytics: Analytics = createAnalytics({
  sink: { send: (event) => activeSink.send(event) },
});

export const setAnalyticsSink = (sink: AnalyticsSink): void => {
  activeSink = sink;
};
export const resetAnalyticsSink = (): void => {
  defaultSink.clear();
  activeSink = defaultSink;
};
export const defaultMemorySink: MemoryAnalyticsSink = defaultSink;
