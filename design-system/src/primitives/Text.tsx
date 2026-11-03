import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '../theme';
import { typography, type TextVariant } from '../tokens/typography';
import type { ColorTokens } from '../tokens/colors';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: keyof ColorTokens;
}

export function Text({ variant = 'body', color = 'text', style, ...rest }: TextProps) {
  const { colors } = useTheme();
  return <RNText {...rest} style={[typography[variant], { color: colors[color] }, style]} />;
}
