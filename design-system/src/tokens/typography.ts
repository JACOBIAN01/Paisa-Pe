export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'caption' | 'mono';

export interface TextStyleToken {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
  letterSpacing?: number;
}

export const typography: Record<TextVariant, TextStyleToken> = {
  display: { fontSize: 36, lineHeight: 44, fontWeight: '700', letterSpacing: -0.5 },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  mono: { fontSize: 16, lineHeight: 24, fontWeight: '500', letterSpacing: 1 },
};
