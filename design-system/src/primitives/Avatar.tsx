import { StyleSheet, View } from 'react-native';
import { Text } from './Text';

export interface AvatarProps {
  name: string;
  color?: string;
  size?: number;
}

export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

export function Avatar({ name, color = '#5B3FD9', size = 40 }: AvatarProps) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={name}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <Text variant="caption" color="textInverse">
        {initialsOf(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
