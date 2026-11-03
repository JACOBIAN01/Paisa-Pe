import { Pressable, StyleSheet, View } from 'react-native';
import type { Paise } from '@pp/contracts-domain';
import { BalanceText, Card, Text } from '@pp/design-system';
import { useT } from '../hooks/useT';

export interface BalanceCardProps {
  balance: Paise;
  masked: boolean;
  onToggleMask: () => void;
}

export function BalanceCard({ balance, masked, onToggleMask }: BalanceCardProps) {
  const t = useT();
  return (
    <Card>
      <Text variant="caption" color="textMuted">
        {t('home.balance')}
      </Text>
      <View style={styles.row}>
        <BalanceText paise={balance} masked={masked} testID="home-balance" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={masked ? t('home.showBalance') : t('home.hideBalance')}
          onPress={onToggleMask}
          hitSlop={12}
          testID="toggle-balance"
        >
          <Text variant="caption" color="primary">
            {masked ? t('home.showBalance') : t('home.hideBalance')}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});
