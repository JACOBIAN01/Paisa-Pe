import { setClock, type Clock } from '@pp/core-time';

export interface FakeClock extends Clock {
  /** Moves wall and monotonic time forward together. */
  advance(ms: number): void;
  /** Jumps wall time only, like a user changing the date. Monotonic time is untouched. */
  set(ms: number): void;
  /** Makes this the app-wide clock returned by `getClock()`. */
  install(): void;
  /**
   * Advances the clock and, when jest fake timers are active, runs the timers
   * that fall due, awaiting any promises they resolve.
   */
  tick(ms: number): Promise<void>;
}

export const DEFAULT_START = Date.UTC(2026, 0, 15, 6, 30, 0);

export function createFakeClock(start: number = DEFAULT_START): FakeClock {
  let wall = start;
  let mono = 1_000;
  const clock: FakeClock = {
    now: () => wall,
    monotonic: () => mono,
    advance(ms) {
      wall += ms;
      mono += ms;
    },
    set(ms) {
      wall = ms;
    },
    install() {
      setClock(clock);
    },
    async tick(ms) {
      clock.advance(ms);
      if (typeof jest !== 'undefined' && typeof jest.advanceTimersByTimeAsync === 'function') {
        try {
          await jest.advanceTimersByTimeAsync(ms);
        } catch {
          // Real timers are active; there is nothing to run.
        }
      }
    },
  };
  return clock;
}
