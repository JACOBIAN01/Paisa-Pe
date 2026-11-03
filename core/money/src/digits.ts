const DEVANAGARI_ZERO = 0x0966;
const BENGALI_ZERO = 0x09e6;

export type DigitScript = 'latin' | 'devanagari' | 'bengali';

const NATIVE_ZERO: Record<Exclude<DigitScript, 'latin'>, number> = {
  devanagari: DEVANAGARI_ZERO,
  bengali: BENGALI_ZERO,
};

/** Converts Devanagari and Bengali digits to Latin digits. Everything else is untouched. */
export function normalizeDigits(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= DEVANAGARI_ZERO && code <= DEVANAGARI_ZERO + 9)
      out += String(code - DEVANAGARI_ZERO);
    else if (code >= BENGALI_ZERO && code <= BENGALI_ZERO + 9) out += String(code - BENGALI_ZERO);
    else out += ch;
  }
  return out;
}

/** Converts Latin digits to the digits of `script`. */
export function toScriptDigits(text: string, script: DigitScript): string {
  if (script === 'latin') return text;
  const zero = NATIVE_ZERO[script];
  return text.replace(/[0-9]/g, (d) => String.fromCodePoint(zero + Number(d)));
}

export const scriptForLanguage = (language: string): DigitScript =>
  language === 'hi' ? 'devanagari' : language === 'bn' ? 'bengali' : 'latin';
