import { useSyncExternalStore } from 'react';
import type { Language } from '@pp/contracts-domain';
import { getLanguage, subscribe } from '@pp/core-i18n';

export function useUiLanguage(): Language {
  return useSyncExternalStore(subscribe, getLanguage, getLanguage);
}
