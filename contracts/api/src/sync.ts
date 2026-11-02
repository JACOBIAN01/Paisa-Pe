import { z } from 'zod';
import { NoteEditSchema, SyncPageSchema, TxnSchema } from '@pp/contracts-domain';
import { defineEndpoint } from './define';

export const sync = {
  'sync.delta': defineEndpoint({
    method: 'GET',
    path: '/sync/delta',
    auth: true,
    query: z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(200).optional(),
    }),
    response: SyncPageSchema,
  }),
  'sync.push': defineEndpoint({
    method: 'POST',
    path: '/sync/push',
    auth: true,
    body: z.object({ edits: z.array(NoteEditSchema) }),
    response: z.object({ applied: z.array(TxnSchema), rejected: z.array(z.string()) }),
  }),
};
