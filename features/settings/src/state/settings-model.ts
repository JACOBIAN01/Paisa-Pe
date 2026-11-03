import type { Language, KycTier, Preferences } from '@pp/contracts-domain';
import type { MessageKey } from '@pp/core-i18n';

export const LANGUAGES: readonly Language[] = ['en', 'hi', 'bn'];

export const languageLabelKey = (language: Language): MessageKey => `settings.language.${language}`;

export const SETTINGS_LINKS = [
  { route: '/security', labelKey: 'security.title' },
  { route: '/kyc', labelKey: 'settings.kyc' },
  { route: '/contacts', labelKey: 'settings.contacts' },
  { route: '/notifications', labelKey: 'notifications.title' },
  { route: '/help', labelKey: 'help.title' },
] as const satisfies ReadonlyArray<{ route: string; labelKey: MessageKey }>;

export const kycTierLabel = (tier: KycTier): string => {
  switch (tier) {
    case 'min':
      return 'Minimum';
    case 'basic':
      return 'Basic';
    case 'full':
      return 'Full';
  }
};

export const applyPreferencePatch = (
  current: Preferences,
  patch: Partial<Preferences>,
): Preferences => ({ ...current, ...patch });
