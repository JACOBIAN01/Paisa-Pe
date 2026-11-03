export interface ColorTokens {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryPressed: string;
  success: string;
  warning: string;
  danger: string;
  overlay: string;
}

export const lightColors: ColorTokens = {
  background: '#F7F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F7',
  border: '#DCDFEA',
  text: '#13151F',
  textMuted: '#5C6275',
  textInverse: '#FFFFFF',
  primary: '#5B3FD9',
  primaryPressed: '#4730B3',
  success: '#1B8A4B',
  warning: '#B26A00',
  danger: '#C62828',
  overlay: 'rgba(10, 12, 20, 0.5)',
};

export const darkColors: ColorTokens = {
  background: '#0E1018',
  surface: '#181B27',
  surfaceAlt: '#222637',
  border: '#2E3348',
  text: '#F2F3F8',
  textMuted: '#9AA0B8',
  textInverse: '#0E1018',
  primary: '#8D78F5',
  primaryPressed: '#7560E0',
  success: '#4CC47F',
  warning: '#F0A93B',
  danger: '#F06A6A',
  overlay: 'rgba(0, 0, 0, 0.65)',
};
