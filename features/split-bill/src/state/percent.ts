const PATTERN = /^(\d{1,3})(?:\.(\d{1,2}))?$/;

/** "12.5" -> 1250 basis points. Integer arithmetic only; returns null for anything else. */
export function parsePercentBps(text: string): number | null {
  const match = PATTERN.exec(text.trim());
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? '').padEnd(2, '0') || '0');
  const bps = whole * 100 + fraction;
  return bps <= 10_000 ? bps : null;
}
