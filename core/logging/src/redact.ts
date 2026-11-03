const MASK = '[redacted]';

const SENSITIVE_KEY =
  /^(pin|otp|code|password|passcode|token|accesstoken|refreshtoken|authorization|secret|pan|cvv|note|memo|phone|mobile|msisdn|cardnumber)$/i;

const PHONE_IN_TEXT = /(\+?91[\s-]?)?[6-9]\d{9}\b/g;
const BEARER_IN_TEXT = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const CARD_IN_TEXT = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;

export function redactString(text: string): string {
  return text
    .replace(BEARER_IN_TEXT, `Bearer ${MASK}`)
    .replace(CARD_IN_TEXT, MASK)
    .replace(PHONE_IN_TEXT, MASK);
}

const MAX_DEPTH = 8;

/** Returns a deep copy with sensitive keys masked and sensitive-looking strings scrubbed. */
export function redact(value: unknown): unknown {
  return walk(value, new WeakSet(), 0);
}

function walk(value: unknown, seen: WeakSet<object>, depth: number): unknown {
  if (typeof value === 'string') return redactString(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[circular]';
  if (depth >= MAX_DEPTH) return '[truncated]';
  seen.add(value);

  if (value instanceof Error) {
    return { name: value.name, message: redactString(value.message) };
  }
  if (Array.isArray(value)) {
    return value.map((item) => walk(item, seen, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    out[key] = SENSITIVE_KEY.test(key) ? MASK : walk(inner, seen, depth + 1);
  }
  return out;
}
