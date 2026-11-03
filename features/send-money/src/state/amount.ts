import type { Paise } from '@pp/contracts-domain';

/** Plain decimal rupees, e.g. 25050 -> "250.50". Safe to put in a route param. */
export function toAmountParam(amount: Paise): string {
  const whole = Math.floor(amount / 100);
  const frac = String(amount % 100).padStart(2, '0');
  return `${whole}.${frac}`;
}

export const toPhone = (digits: string) => `+91${digits}`;

export const digitsOnly = (text: string): string => text.replace(/\D/g, '').slice(0, 10);
