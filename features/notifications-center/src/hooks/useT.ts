import { useSyncExternalStore } from 'react';
import { getLanguage, subscribe, t } from '@pp/core-i18n';

/** Re-renders when the UI language changes and returns the translate function. */
export function useT(): typeof t {
  useSyncExternalStore(subscribe, getLanguage, getLanguage);
  return t;
}
