import { Pressable, StyleSheet } from 'react-native';
import { Stack, Text, useTheme } from '@pp/design-system';
import type { Language } from '@pp/contracts-domain';
import { LANGUAGE_OPTIONS } from '../state/slides';

interface Props {
  value: Language;
  onChange: (next: Language) => void;
}

export function LanguageChips({ value, onChange }: Props) {
  const { colors } = useTheme();
  return (
    <Stack direction="row" gap="sm" justify="center" accessibilityRole="radiogroup">
      {LANGUAGE_OPTIONS.map((option) => {
        const selected = option.code === value;
        return (
          <Pressable
            key={option.code}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.code)}
            style={[
              styles.chip,
              {
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.surfaceAlt : colors.surface,
              },
            ]}
          >
            <Text color={selected ? 'primary' : 'text'}>{option.label}</Text>
          </Pressable>
        );
      })}
    </Stack>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 16 },
});
