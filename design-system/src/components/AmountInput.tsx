import type { Paise } from '@pp/contracts-domain';
import { formatAmountInput, parseAmount } from '@pp/core-money';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '../theme';
import { radii, spacing } from '../tokens/layout';
import { Text } from '../primitives/Text';

export interface AmountInputProps {
  value: string;
  onChangeValue: (raw: string, paise: Paise | null) => void;
  label?: string;
  error?: string;
  autoFocus?: boolean;
}

export function AmountInput({
  value,
  onChangeValue,
  label = 'Amount',
  error,
  autoFocus = false,
}: AmountInputProps) {
  const { colors } = useTheme();

  const handleChange = (text: string) => {
    const formatted = formatAmountInput(text);
    onChangeValue(formatted, parseAmount(formatted));
  };

  return (
    <View style={styles.wrap}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <View style={[styles.field, { borderColor: error ? colors.danger : colors.border }]}>
        <Text variant="display">₹</Text>
        <TextInput
          testID="amount-input"
          accessibilityLabel={label}
          value={value}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          autoFocus={autoFocus}
          style={[styles.input, { color: colors.text }]}
        />
      </View>
      {error ? (
        <Text variant="caption" color="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderRadius: radii.sm,
  },
  input: { flex: 1, fontSize: 36, fontWeight: '700', paddingVertical: spacing.sm },
});
