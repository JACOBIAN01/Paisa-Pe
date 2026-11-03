import { useEffect, useState } from 'react';
import { getLanguage, setLanguage, subscribe } from '@pp/core-i18n';
import { appAnalytics } from '@pp/core-analytics';
import type { Language } from '@pp/contracts-domain';

/** Current UI language plus a setter that also records the change. */
export function useLanguage(): [Language, (next: Language) => void] {
  const [language, setCurrent] = useState<Language>(getLanguage());

  useEffect(() => {
    setCurrent(getLanguage());
    return subscribe(setCurrent);
  }, []);

  const change = (next: Language): void => {
    setLanguage(next);
    appAnalytics.track('language_changed', { language: next });
  };

  return [language, change];
}
