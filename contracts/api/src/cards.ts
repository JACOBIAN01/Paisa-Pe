import { z } from 'zod';
import { CardRevealSchema, CardSchema } from '@pp/contracts-domain';
import { defineEndpoint } from './define';
import { IdParamsSchema } from './common';

const CardResponse = z.object({ card: CardSchema });

export const cards = {
  'cards.list': defineEndpoint({
    method: 'GET',
    path: '/cards',
    auth: true,
    response: z.object({ items: z.array(CardSchema) }),
  }),
  'cards.freeze': defineEndpoint({
    method: 'POST',
    path: '/cards/:id/freeze',
    auth: true,
    params: IdParamsSchema,
    response: CardResponse,
  }),
  'cards.unfreeze': defineEndpoint({
    method: 'POST',
    path: '/cards/:id/unfreeze',
    auth: true,
    params: IdParamsSchema,
    response: CardResponse,
  }),
  'cards.reveal': defineEndpoint({
    method: 'POST',
    path: '/cards/:id/reveal',
    auth: true,
    params: IdParamsSchema,
    response: z.object({ reveal: CardRevealSchema }),
  }),
};
