import { memo } from 'react';
import type { Txn } from '@pp/contracts-domain';
import { formatDate } from '@pp/core-i18n';
import { formatPaise } from '@pp/core-money';
import { Badge, ListRow, Text } from '@pp/design-system';
import { useT } from '../hooks/useT';
import { isIncoming } from '../state/filters';

export interface TxnRowProps {
  txn: Txn;
  language: Parameters<typeof formatDate>[1];
  onPress: (id: string) => void;
}

export const STATUS_TONE = {
  success: 'success',
  pending: 'warning',
  failed: 'danger',
  reversed: 'neutral',
} as const;

function TxnRowView({ txn, language, onPress }: TxnRowProps) {
  const t = useT();
  const incoming = isIncoming(txn);
  const title = txn.counterparty?.name ?? t(`history.type.${txn.type}`);
  return (
    <ListRow
      testID={`txn-${txn.id}`}
      title={title}
      subtitle={`${formatDate(txn.createdAt, language, 'Asia/Kolkata', { withTime: false })} · ${t(`history.type.${txn.type}`)}`}
      onPress={() => onPress(txn.id)}
      right={
        <>
          {txn.status === 'success' ? null : (
            <Badge label={t(`history.status.${txn.status}`)} tone={STATUS_TONE[txn.status]} />
          )}
          <Text variant="body" color={incoming ? 'success' : 'text'}>
            {incoming ? '+' : '-'}
            {formatPaise(txn.amount)}
          </Text>
        </>
      }
    />
  );
}

export const TxnRow = memo(TxnRowView);
