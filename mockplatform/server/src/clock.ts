import type { Clock } from '@pp/core-time';

export interface ManualClock extends Clock {
  advance(ms: number): void;
  set(ms: number): void;
}

/** Test clock: wall time and monotonic time only move when told to. */
export function createManualClock(start: number): ManualClock {
  let wall = start;
  let mono = 0;
  return {
    now: () => wall,
    monotonic: () => mono,
    advance(ms) {
      wall += ms;
      mono += ms;
    },
    set(ms) {
      wall = ms;
    },
  };
}
