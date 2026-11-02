import { z } from 'zod';

export const BRIDGE_VERSION = 1;

const envelope = <T extends string, P extends z.ZodTypeAny>(type: T, payload: P) =>
  z.object({ v: z.literal(BRIDGE_VERSION), id: z.string(), type: z.literal(type), payload });

const empty = z.object({}).strict();

/** Messages posted by help-centre pages to the app. */
export const WebToNativeSchema = z.discriminatedUnion('type', [
  envelope('ready', empty),
  envelope('resize', z.object({ height: z.number().positive() })),
  envelope('navigate', z.object({ route: z.string() })),
  envelope('open-article', z.object({ articleId: z.string() })),
  envelope(
    'contact-support',
    z.object({ topic: z.enum(['payments', 'account', 'cards', 'other']) }),
  ),
  envelope('close', empty),
]);
export type WebToNative = z.infer<typeof WebToNativeSchema>;

/** Messages posted by the app to help-centre pages. */
export const NativeToWebSchema = z.discriminatedUnion('type', [
  envelope(
    'init',
    z.object({
      theme: z.enum(['light', 'dark']),
      language: z.enum(['en', 'hi', 'bn']),
      appVersion: z.string(),
    }),
  ),
  envelope('set-language', z.object({ language: z.enum(['en', 'hi', 'bn']) })),
]);
export type NativeToWeb = z.infer<typeof NativeToWebSchema>;
