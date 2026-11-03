import { Pressable, StyleSheet, View } from 'react-native';
import type { RouteName } from '@pp/contracts-domain';
import type { MessageKey } from '@pp/core-i18n';
import { Text, useTheme } from '@pp/design-system';
import { useT } from '../hooks/useT';

interface Action {
  route: RouteName;
  label: MessageKey;
}

export const QUICK_ACTIONS: Action[] = [
  { route: 'send', label: 'home.send' },
  { route: 'request', label: 'home.request' },
  { route: 'split', label: 'home.split' },
  { route: 'qr-scan', label: 'home.scan' },
  { route: 'bills', label: 'home.bills' },
  { route: 'cards', label: 'home.cards' },
  { route: 'goals', label: 'home.goals' },
];

export function QuickActions({ onOpen }: { onOpen: (route: RouteName) => void }) {
  const t = useT();
  const { colors } = useTheme();
  return (
    <View style={styles.grid}>
      {QUICK_ACTIONS.map((action) => (
        <Pressable
          key={action.route}
          accessibilityRole="button"
          accessibilityLabel={t(action.label)}
          onPress={() => onOpen(action.route)}
          testID={`action-${action.route}`}
          style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text variant="caption">{t(action.label)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    minWidth: 76,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
});
