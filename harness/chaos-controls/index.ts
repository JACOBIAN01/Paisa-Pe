import type { Chaos } from '@pp/mock-chaos';

type Target = string | { endpoint?: string; method?: string; path?: string | RegExp };

const matcher = (target?: Target) => (typeof target === 'string' ? { endpoint: target } : target);

/** Readable wrappers over the mock platform's chaos switches. */
export function chaosControls(chaos: Chaos) {
  return {
    /** Both legs of the network take this long. */
    slowNetwork(ms: number, jitterMs = 0): void {
      chaos.setLatency({ uplinkMs: ms, downlinkMs: ms, jitterMs });
    },
    /** Only the response leg is slow: the server has already processed the request. */
    slowResponses(ms: number): void {
      chaos.setLatency({ downlinkMs: ms });
    },
    fastNetwork(): void {
      chaos.setLatency({ uplinkMs: 0, downlinkMs: 0, jitterMs: 0 });
    },
    /** Gateway rejects the request before the server sees it. */
    failNext(target?: Target, count = 1): void {
      chaos.failNext(matcher(target), count);
    },
    /** Request is lost on the way up; the client waits until it gives up. */
    timeoutNext(target?: Target, count = 1): void {
      chaos.timeoutNext(matcher(target), count);
    },
    /** Server processes the request, but the response never reaches the client. */
    dropResponse(target?: Target, count = 1): void {
      chaos.dropResponse(matcher(target), count);
    },
    skewServerClock(ms: number): void {
      chaos.clockSkew(ms);
    },
    reset(): void {
      chaos.reset();
    },
  };
}

export type ChaosControls = ReturnType<typeof chaosControls>;
