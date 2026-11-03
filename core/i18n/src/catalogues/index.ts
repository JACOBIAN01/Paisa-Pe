import type { Language } from '@pp/contracts-domain';
import { bn } from './bn';
import { en, type MessageKey } from './en';
import { hi } from './hi';

export type Catalogue = Record<MessageKey, string>;

export const catalogues: Record<Language, Catalogue> = { en, hi, bn };
export type { MessageKey };
