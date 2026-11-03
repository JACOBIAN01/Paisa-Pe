export interface Slide {
  id: string;
  glyph: string;
  title: string;
  body: string;
}

export const SLIDES: readonly Slide[] = [
  {
    id: 'send',
    glyph: '💸',
    title: 'Send money in seconds',
    body: 'Pay anyone with just their mobile number or a QR code. No account numbers, no waiting.',
  },
  {
    id: 'rewards',
    glyph: '🎁',
    title: 'Earn as you pay',
    body: 'Collect cashback, scratch cards and coupons on everyday payments and bills.',
  },
  {
    id: 'safe',
    glyph: '🔒',
    title: 'Locked down by default',
    body: 'Your PIN and biometrics guard every payment, and you can sign out any device remotely.',
  },
];

export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'bn', label: 'বাংলা' },
] as const;
