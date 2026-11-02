import { z } from 'zod';
import { TxnIdSchema } from './ids';
import { EpochMsSchema } from './money';
import { TxnSchema } from './txn';

export const SyncPageSchema = z.object({
  items: z.array(TxnSchema),
  /** Opaque; pass back unchanged. Null when the client is caught up. */
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  serverTime: EpochMsSchema,
});
export type SyncPage = z.infer<typeof SyncPageSchema>;

export const NoteEditSchema = z.object({
  txnId: TxnIdSchema,
  note: z.string().max(140),
  /** Device clock at edit time. */
  clientUpdatedAt: EpochMsSchema,
});
export type NoteEdit = z.infer<typeof NoteEditSchema>;
