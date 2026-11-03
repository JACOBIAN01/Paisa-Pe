import { ActivityIndicator } from 'react-native';
import { useTheme } from '../theme';

export interface SpinnerProps {
  size?: 'small' | 'large';
  label?: string;
}

export function Spinner({ size = 'small', label = 'Loading' }: SpinnerProps) {
  const { colors } = useTheme();
  return <ActivityIndicator size={size} color={colors.primary} accessibilityLabel={label} />;
}
