import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { darkColors, lightColors, type ColorTokens } from '../tokens/colors';

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  colors: ColorTokens;
}

export const themes: Record<ThemeMode, Theme> = {
  light: { mode: 'light', colors: lightColors },
  dark: { mode: 'dark', colors: darkColors },
};

const ThemeContext = createContext<Theme>(themes.light);

export interface ThemeProviderProps {
  mode?: ThemeMode;
  children: ReactNode;
}

export function ThemeProvider({ mode = 'light', children }: ThemeProviderProps) {
  const value = useMemo(() => themes[mode], [mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = (): Theme => useContext(ThemeContext);
