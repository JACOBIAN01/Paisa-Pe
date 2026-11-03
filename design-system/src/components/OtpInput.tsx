import { useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '../theme';
import { radii, spacing } from '../tokens/layout';
import { Text } from '../primitives/Text';

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
}

export function OtpInput({ value, onChange, length = 6, autoFocus = false }: OtpInputProps) {
  const { colors } = useTheme();
  const input = useRef<TextInput>(null);

  const handleChange = (text: string) => onChange(text.replace(/\D/g, '').slice(0, length));

  return (
    <Pressable
      onPress={() => input.current?.focus()}
      style={styles.row}
      accessibilityLabel="One-time code"
    >
      {Array.from({ length }, (_, i) => (
        <View
          key={i}
          style={[
            styles.cell,
            {
              borderColor: i === value.length ? colors.primary : colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <Text variant="title">{value[i] ?? ''}</Text>
        </View>
      ))}
      <TextInput
        ref={input}
        testID="otp-input"
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus={autoFocus}
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  cell: {
    width: 44,
    height: 56,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
