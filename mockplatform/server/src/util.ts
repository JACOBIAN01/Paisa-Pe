import { fail } from './errors';

/** Integer division of non-negative numbers, rounding half up. */
export const divHalfUp = (numerator: number, denominator: number): number =>
  Math.floor((numerator * 2 + denominator) / (denominator * 2));

/** `bps` basis points of `amount` paise, rounded half up to a whole paisa. */
export const bpsOf = (amount: number, bps: number): number => divHalfUp(amount * bps, 10_000);

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function encodeCursor(stamp: number, id: string): string {
  const bytes = Array.from(`${stamp}|${id}`, (c) => c.charCodeAt(0));
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const chunk = ((bytes[i] ?? 0) << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += ALPHABET[(chunk >> 18) & 63] ?? '';
    out += ALPHABET[(chunk >> 12) & 63] ?? '';
    if (i + 1 < bytes.length) out += ALPHABET[(chunk >> 6) & 63] ?? '';
    if (i + 2 < bytes.length) out += ALPHABET[chunk & 63] ?? '';
  }
  return out;
}

export function decodeCursor(cursor: string): { stamp: number; id: string } {
  const values = Array.from(cursor, (c) => ALPHABET.indexOf(c));
  if (values.length === 0 || values.includes(-1)) throw fail('invalid_request', 'Malformed cursor');
  const bytes: number[] = [];
  for (let i = 0; i < values.length; i += 4) {
    const [a = 0, b = 0, c, d] = values.slice(i, i + 4);
    const chunk = (a << 18) | (b << 12) | ((c ?? 0) << 6) | (d ?? 0);
    bytes.push((chunk >> 16) & 255);
    if (c !== undefined) bytes.push((chunk >> 8) & 255);
    if (d !== undefined) bytes.push(chunk & 255);
  }
  const text = String.fromCharCode(...bytes);
  const sep = text.indexOf('|');
  const stamp = Number(text.slice(0, sep));
  if (sep < 1 || !Number.isInteger(stamp)) throw fail('invalid_request', 'Malformed cursor');
  return { stamp, id: text.slice(sep + 1) };
}

/** Orders by (time, id); used for list pagination and delta sync. */
export const compareStamped = (
  a: { time: number; id: string },
  b: { time: number; id: string },
): number => (a.time !== b.time ? a.time - b.time : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
