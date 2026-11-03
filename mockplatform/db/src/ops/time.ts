const IST_OFFSET_MS = 19_800_000;
export const DAY_MS = 86_400_000;

/** Start (UTC epoch ms) of the IST calendar day containing `ms`. */
export const istDayStart = (ms: number): number =>
  Math.floor((ms + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;

/** Start (UTC epoch ms) of the IST calendar month containing `ms`. */
export function istMonthStart(ms: number): number {
  const shifted = new Date(ms + IST_OFFSET_MS);
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1) - IST_OFFSET_MS;
}
