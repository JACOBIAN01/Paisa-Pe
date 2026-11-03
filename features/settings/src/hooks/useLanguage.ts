import { useSyncExternalStore } from 'react';
import type { Language } from '@pp/contracts-domain';
import { getLanguage, subscribe } from '@pp/core-i18n';

/** Re-renders the caller whenever the UI language changes. */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, getLanguage, getLanguage);
}
