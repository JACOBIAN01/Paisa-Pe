import { z } from 'zod';

/** Integer paise (1 INR = 100 paise). Never a float. */
export const PaiseSchema = z.number().int().safe().brand<'Paise'>();
export type Paise = z.infer<typeof PaiseSchema>;

export const CurrencySchema = z.literal('INR');
export type Currency = z.infer<typeof CurrencySchema>;

export const MoneySchema = z.object({
  paise: PaiseSchema,
  currency: CurrencySchema,
});
export type Money = z.infer<typeof MoneySchema>;

/** Milliseconds since the Unix epoch. */
export const EpochMsSchema = z.number().int().nonnegative();
export type EpochMs = z.infer<typeof EpochMsSchema>;
