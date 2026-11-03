import type { MessageKey } from '@pp/core-i18n';

export const HELP_URL = 'https://help.paisape.app/app';

const ARTICLE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** URL for one article, or null when the id is not a plain slug. */
export const articleUrl = (articleId: string): string | null =>
  ARTICLE_ID.test(articleId) ? `https://help.paisape.app/articles/${articleId}` : null;

export interface FaqItem {
  id: string;
  question: MessageKey;
  answer: MessageKey;
}

export const FAQ: readonly FaqItem[] = [
  { id: 'limits', question: 'help.faq.limits.q', answer: 'help.faq.limits.a' },
  { id: 'failed', question: 'help.faq.failed.q', answer: 'help.faq.failed.a' },
  { id: 'card', question: 'help.faq.card.q', answer: 'help.faq.card.a' },
  { id: 'lock', question: 'help.faq.lock.q', answer: 'help.faq.lock.a' },
];

export type SupportTopic = 'payments' | 'account' | 'cards' | 'other';

export const SUPPORT_TOPICS: ReadonlyArray<{ topic: SupportTopic; label: MessageKey }> = [
  { topic: 'payments', label: 'help.contact.payments' },
  { topic: 'account', label: 'help.contact.account' },
  { topic: 'cards', label: 'help.contact.cards' },
  { topic: 'other', label: 'help.contact.other' },
];
