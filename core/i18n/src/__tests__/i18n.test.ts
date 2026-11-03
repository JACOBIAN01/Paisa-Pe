import type { Paise } from '@pp/contracts-domain';
import { catalogues } from '../catalogues';
import { formatCurrency, formatDate, formatNumber } from '../format';
import { createI18n, getLanguage, setLanguage, subscribe, t, tn } from '../i18n';
import { plural, pluralCategory } from '../plural';

const placeholders = (s: string): string[] =>
  [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1] as string).sort();

describe('catalogues', () => {
  const enKeys = Object.keys(catalogues.en).sort();

  it.each(['hi', 'bn'] as const)('%s has exactly the English keys', (lang) => {
    expect(Object.keys(catalogues[lang]).sort()).toEqual(enKeys);
  });

  it.each(['hi', 'bn'] as const)(
    '%s keeps the same placeholders and has no empty strings',
    (lang) => {
      for (const key of enKeys) {
        const en = catalogues.en[key as keyof typeof catalogues.en];
        const other = catalogues[lang][key as keyof typeof catalogues.en];
        expect(other.trim()).not.toBe('');
        expect({ key, p: placeholders(other) }).toEqual({ key, p: placeholders(en) });
      }
    },
  );

  it('has a healthy number of keys', () => {
    expect(enKeys.length).toBeGreaterThanOrEqual(120);
  });
});

describe('createI18n', () => {
  it('interpolates and leaves unknown placeholders intact', () => {
    const i18n = createI18n('en');
    expect(i18n.t('home.greeting', { name: 'Asha' })).toBe('Hello, Asha');
    expect(i18n.t('home.greeting')).toBe('Hello, {name}');
  });

  it('translates', () => {
    expect(createI18n('hi').t('common.done')).toBe('हो गया');
    expect(createI18n('bn').t('common.done')).toBe('সম্পন্ন');
  });

  it('falls back to English when a key is missing from the active catalogue', () => {
    const original = catalogues.hi['common.done'];
    delete (catalogues.hi as Partial<typeof catalogues.hi>)['common.done'];
    try {
      expect(createI18n('hi').t('common.done')).toBe('Done');
    } finally {
      catalogues.hi['common.done'] = original;
    }
  });

  it('pluralises', () => {
    const en = createI18n('en');
    expect(en.tn('history.count', 1)).toBe('1 transaction');
    expect(en.tn('history.count', 0)).toBe('0 transactions');
    expect(en.tn('history.count', 5)).toBe('5 transactions');
  });

  it('has() narrows keys', () => {
    expect(createI18n('en').has('home.send')).toBe(true);
    expect(createI18n('en').has('nope')).toBe(false);
  });
});

describe('global language', () => {
  afterEach(() => setLanguage('en'));

  it('switches language and notifies subscribers once per change', () => {
    const listener = jest.fn();
    const off = subscribe(listener);
    setLanguage('hi');
    setLanguage('hi');
    expect(getLanguage()).toBe('hi');
    expect(t('common.close')).toBe('बंद करें');
    expect(tn('requests.count', 2)).toBe('2 अनुरोध');
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    setLanguage('bn');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('plural rules', () => {
  it('differs between English and Hindi at zero', () => {
    expect(pluralCategory('en', 0)).toBe('other');
    expect(pluralCategory('hi', 0)).toBe('one');
    expect(pluralCategory('bn', 2)).toBe('other');
    expect(plural('en', 1, { one: 'a', other: 'b' })).toBe('a');
  });
});

describe('formatting', () => {
  it('formats numbers with Indian grouping', () => {
    expect(formatNumber(1234567, 'en')).toBe('12,34,567');
    expect(formatNumber(-1234.5, 'en')).toBe('-1,234.5');
    expect(formatNumber(1234, 'hi', { nativeDigits: true })).toBe('१,२३४');
  });

  it('formats currency through core-money', () => {
    expect(formatCurrency(12_345_650 as Paise, 'en')).toBe('₹1,23,456.50');
    expect(formatCurrency(12_300 as Paise, 'bn', { nativeDigits: true })).toBe('₹১২৩.০০');
  });

  it('formats dates in IST by default', () => {
    // 2026-11-03T10:35:00Z is 16:05 IST
    const ts = Date.UTC(2026, 10, 3, 10, 35);
    expect(formatDate(ts, 'en')).toBe('3 Nov 2026, 4:05 pm');
    expect(formatDate(ts, 'en', 'UTC')).toBe('3 Nov 2026, 10:35 am');
    expect(formatDate(ts, 'en', 'Asia/Kolkata', { withTime: false })).toBe('3 Nov 2026');
    expect(formatDate(ts, 'en', -300)).toBe('3 Nov 2026, 5:35 am');
  });

  it('handles midnight, noon and day rollover', () => {
    expect(formatDate(Date.UTC(2026, 0, 1, 18, 30), 'en')).toBe('2 Jan 2026, 12:00 am');
    expect(formatDate(Date.UTC(2026, 0, 1, 6, 30), 'en')).toBe('1 Jan 2026, 12:00 pm');
  });

  it('uses native digits when asked', () => {
    expect(formatDate(Date.UTC(2026, 10, 3, 10, 35), 'hi', 'UTC', { nativeDigits: true })).toBe(
      '३ नव २०२६, १०:३५ पूर्वाह्न',
    );
  });
});
