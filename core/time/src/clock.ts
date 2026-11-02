export interface Clock {
  /** Wall-clock epoch milliseconds. Can jump (NTP, user changes the date). */
  now(): number;
  /** Milliseconds from an arbitrary origin. Never goes backwards. */
  monotonic(): number;
}

const origin = Date.now();
const perfNow = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now() - origin;

export const systemClock: Clock = {
  now: () => Date.now(),
  monotonic: perfNow,
};

let current: Clock = systemClock;

export const getClock = (): Clock => current;
export const setClock = (clock: Clock): void => {
  current = clock;
};
export const resetClock = (): void => {
  current = systemClock;
};
