import { createRng } from '@pp/mock-db';
import { matches, type RequestInfo, type RequestMatcher } from './matcher';

export interface LatencyConfig {
  /** Milliseconds before the server sees the request. */
  uplinkMs: number;
  /** Milliseconds before the client sees the response. */
  downlinkMs: number;
  /** Extra random milliseconds (0..jitterMs) added to each leg. */
  jitterMs: number;
}

export interface FailureResponse {
  status: number;
  code: string;
  message: string;
  retryable: boolean;
}

export type DropMode = 'error' | 'hang';

export type ChaosAction =
  | { kind: 'normal' }
  | { kind: 'fail'; response: FailureResponse }
  | { kind: 'timeout' }
  | { kind: 'drop'; mode: DropMode };

export interface ChaosPlan {
  uplinkMs: number;
  downlinkMs: number;
  action: ChaosAction;
}

interface Rule {
  matcher: RequestMatcher | undefined;
  remaining: number;
  action: Exclude<ChaosAction, { kind: 'normal' }>;
}

const DEFAULT_FAILURE: FailureResponse = {
  status: 503,
  code: 'server_error',
  message: 'Service temporarily unavailable',
  retryable: true,
};

export interface Chaos {
  setLatency(config: Partial<LatencyConfig>): void;
  getLatency(): LatencyConfig;
  /** The next `count` matching requests are rejected by the gateway; the server never processes them. */
  failNext(matcher?: RequestMatcher, count?: number, response?: Partial<FailureResponse>): void;
  /** The next `count` matching requests are lost before reaching the server; the client waits until it aborts. */
  timeoutNext(matcher?: RequestMatcher, count?: number): void;
  /** The server processes the next `count` matching requests but the response never reaches the client. */
  dropResponse(matcher?: RequestMatcher, count?: number, mode?: DropMode): void;
  clockSkew(ms: number): void;
  getClockSkew(): number;
  pending(): number;
  reset(): void;
  plan(info: RequestInfo): ChaosPlan;
}

export function createChaos(seed = 1): Chaos {
  const rng = createRng(seed);
  let latency: LatencyConfig = { uplinkMs: 0, downlinkMs: 0, jitterMs: 0 };
  let skew = 0;
  let rules: Rule[] = [];

  const leg = (base: number): number =>
    base + (latency.jitterMs > 0 ? rng.int(0, latency.jitterMs) : 0);
  const add = (rule: Rule): void => {
    rules.push(rule);
  };

  return {
    setLatency(config) {
      latency = { ...latency, ...config };
    },
    getLatency: () => ({ ...latency }),
    failNext(matcher, count = 1, response) {
      add({
        matcher,
        remaining: count,
        action: { kind: 'fail', response: { ...DEFAULT_FAILURE, ...response } },
      });
    },
    timeoutNext(matcher, count = 1) {
      add({ matcher, remaining: count, action: { kind: 'timeout' } });
    },
    dropResponse(matcher, count = 1, mode = 'error') {
      add({ matcher, remaining: count, action: { kind: 'drop', mode } });
    },
    clockSkew(ms) {
      skew = ms;
    },
    getClockSkew: () => skew,
    pending: () => rules.reduce((sum, r) => sum + r.remaining, 0),
    reset() {
      latency = { uplinkMs: 0, downlinkMs: 0, jitterMs: 0 };
      skew = 0;
      rules = [];
    },
    plan(info) {
      const rule = rules.find((r) => r.remaining > 0 && matches(r.matcher, info));
      let action: ChaosAction = { kind: 'normal' };
      if (rule) {
        rule.remaining -= 1;
        action = rule.action;
        rules = rules.filter((r) => r.remaining > 0);
      }
      return { uplinkMs: leg(latency.uplinkMs), downlinkMs: leg(latency.downlinkMs), action };
    },
  };
}
