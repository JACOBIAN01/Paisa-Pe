import { View } from 'react-native';
import type { Txn } from '@pp/contracts-domain';
import { formatPaise } from '@pp/core-money';
import { EmptyState, ListRow, SectionHeader, Text } from '@pp/design-system';
import { useT } from '../hooks/useT';

const INCOMING: ReadonlySet<Txn['type']> = new Set([
  'p2p_receive',
  'add_money',
  'cashback',
  'refund',
  'goal_withdraw',
]);

export interface RecentActivityProps {
  txns: Txn[];
  onOpenTxn: (id: string) => void;
  onSeeAll: () => void;
}

export function RecentActivity({ txns, onOpenTxn, onSeeAll }: RecentActivityProps) {
  const t = useT();
  return (
    <View>
      <SectionHeader
        title={t('home.recentActivity')}
        actionLabel={t('common.seeAll')}
        onAction={onSeeAll}
      />
      {txns.length === 0 ? (
        <EmptyState title={t('home.noActivity')} />
      ) : (
        txns.map((txn) => {
          const incoming = INCOMING.has(txn.type);
          return (
            <ListRow
              key={txn.id}
              testID={`recent-${txn.id}`}
              title={txn.counterparty?.name ?? t(`history.type.${txn.type}`)}
              subtitle={txn.note}
              onPress={() => onOpenTxn(txn.id)}
              right={
                <Text variant="body" color={incoming ? 'success' : 'text'}>
                  {incoming ? '+' : '-'}
                  {formatPaise(txn.amount)}
                </Text>
              }
            />
          );
        })
      )}
    </View>
  );
}
