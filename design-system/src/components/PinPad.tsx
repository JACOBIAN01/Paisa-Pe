import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { radii, spacing } from '../tokens/layout';
import { Text } from '../primitives/Text';

export interface PinPadProps {
  length?: number;
  onComplete: (pin: string) => void;
  onChange?: (pin: string) => void;
  disabled?: boolean;
}

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

export function PinPad({ length = 4, onComplete, onChange, disabled = false }: PinPadProps) {
  const { colors } = useTheme();
  const [pin, setPin] = useState('');

  const update = useCallback(
    (next: string) => {
      setPin(next);
      onChange?.(next);
      if (next.length === length) {
        onComplete(next);
        setPin('');
      }
    },
    [length, onChange, onComplete],
  );

  const press = (key: string) => {
    if (disabled || key === '') return;
    if (key === '⌫') update(pin.slice(0, -1));
    else if (pin.length < length) update(pin + key);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.dots} accessibilityLabel={`${pin.length} of ${length} digits entered`}>
        {Array.from({ length }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                borderColor: colors.primary,
                backgroundColor: i < pin.length ? colors.primary : 'transparent',
              },
            ]}
          />
        ))}
      </View>
      {ROWS.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((key, c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityLabel={key === '⌫' ? 'Delete' : key || undefined}
              disabled={disabled || key === ''}
              onPress={() => press(key)}
              testID={key === '⌫' ? 'pin-key-delete' : key ? `pin-key-${key}` : undefined}
              style={[styles.key, { backgroundColor: key ? colors.surfaceAlt : 'transparent' }]}
            >
              <Text variant="title">{key}</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md },
  dots: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  dot: { width: 14, height: 14, borderRadius: radii.pill, borderWidth: 2 },
  row: { flexDirection: 'row', gap: spacing.lg },
  key: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
