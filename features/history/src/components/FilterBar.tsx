import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text, useTheme } from '@pp/design-system';
import type { MessageKey } from '@pp/core-i18n';
import { useT } from '../hooks/useT';

export interface Option<V extends string> {
  value: V;
  label: MessageKey;
}

export interface ChipRowProps<V extends string> {
  options: Option<V>[];
  selected: V;
  onSelect: (value: V) => void;
  testIdPrefix: string;
}

export function ChipRow<V extends string>({
  options,
  selected,
  onSelect,
  testIdPrefix,
}: ChipRowProps<V>) {
  const t = useT();
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((option) => {
        const active = option.value === selected;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(option.value)}
            testID={`${testIdPrefix}-${option.value}`}
            style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surfaceAlt }]}
          >
            <Text variant="caption" color={active ? 'textInverse' : 'text'}>
              {t(option.label)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
});
