import type { Paise, Phone } from '@pp/contracts-domain';
import { PhoneSchema } from '@pp/contracts-domain';
import { parseAmount } from '@pp/core-money';
import { AppError, err, ok, type Result } from '@pp/core-result';

export interface TransferParams {
  to: Phone;
  amount: Paise;
  note?: string;
}

export type RawParams = string | Record<string, string | string[] | undefined>;

const MAX_NOTE = 140;

const decode = (value: string): string => {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
};

const bad = (reason: string): Result<never> =>
  err(new AppError('invalid_request', `Invalid transfer link: ${reason}`, { details: { reason } }));

function collect(input: RawParams): Result<Record<string, string>> {
  const out: Record<string, string> = {};
  if (typeof input === 'string') {
    const query = input.includes('?') ? input.slice(input.indexOf('?') + 1) : input;
    for (const pair of query.split('#')[0]!.split('&')) {
      if (pair === '') continue;
      const eq = pair.indexOf('=');
      const key = decode(eq === -1 ? pair : pair.slice(0, eq));
      if (key in out) return bad(`duplicate parameter "${key}"`);
      out[key] = eq === -1 ? '' : decode(pair.slice(eq + 1));
    }
    return ok(out);
  }
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length !== 1) return bad(`duplicate parameter "${key}"`);
      out[key] = value[0]!;
    } else out[key] = value;
  }
  return ok(out);
}

/**
 * The single parser for transfer parameters. The confirm screen and the pay handler both call
 * this, so what the user reads is exactly what gets sent.
 */
export function parseTransferParams(input: RawParams): Result<TransferParams> {
  const collected = collect(input);
  if (!collected.ok) return collected;
  const { to, amount, note } = collected.value;

  const phone = PhoneSchema.safeParse(to);
  if (!phone.success) return bad(to === undefined ? 'missing recipient' : 'invalid recipient');
  if (amount === undefined) return bad('missing amount');
  const parsed = parseAmount(amount);
  if (parsed === null) return bad('invalid amount');
  if (note !== undefined && note.length > MAX_NOTE) return bad('note too long');

  return ok({ to: phone.data, amount: parsed, ...(note ? { note } : {}) });
}
