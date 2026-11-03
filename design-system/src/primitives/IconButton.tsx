import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { radii } from '../tokens/layout';
import { Text } from './Text';

export interface IconButtonProps {
  glyph: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

export function IconButton({ glyph, label, onPress, disabled = false, testID }: IconButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={[styles.base, { backgroundColor: colors.surfaceAlt, opacity: disabled ? 0.5 : 1 }]}
    >
      <Text variant="heading">{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
