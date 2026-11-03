import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useService } from '@pp/core-di';
import { getLanguage, formatDate } from '@pp/core-i18n';
import { formatPaise } from '@pp/core-money';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  ListRow,
  Skeleton,
  Stack,
  Text,
  useTheme,
  useToast,
} from '@pp/design-system';
import { useAuthState } from '@pp/svc-auth';
import { SYNC_SERVICE } from '@pp/svc-sync';
import { TRANSFER_SERVICE } from '@pp/svc-transfers';
import { STATUS_TONE } from '../components/TxnRow';
import { useT } from '../hooks/useT';
import { useTxn } from '../hooks/useTxn';
import { isIncoming, paiseToAmountText } from '../state/filters';

export function TxnDetailScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeUserId } = useAuthState();
  const sync = useService(SYNC_SERVICE);
  const transfers = useService(TRANSFER_SERVICE);
  const { txn, loading, missing } = useTxn(activeUserId, id);

  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [repeating, setRepeating] = useState(false);
  const savedNote = txn?.note ?? '';
  useEffect(() => {
    setNote(savedNote);
  }, [savedNote]);

  if (loading) return <Skeleton height={160} />;
  if (!txn || missing) return <EmptyState title={t('history.notFound')} />;

  const incoming = isIncoming(txn);
  const phone = txn.counterparty?.phone;
  const canRepeat = txn.type === 'p2p_send' && phone !== undefined;

  const saveNote = async (): Promise<void> => {
    setSavingNote(true);
    try {
      await sync.editNote(txn.id, note.trim());
      toast.show(t('history.noteSaved'), 'success');
    } catch {
      toast.show(t('history.noteFailed'), 'error');
    } finally {
      setSavingNote(false);
    }
  };

  const repeat = async (): Promise<void> => {
    if (repeating) return;
    setRepeating(true);
    try {
      const intent = await transfers.repeatPayment(txn.id);
      if (!('phone' in intent.to)) throw new Error('unsupported recipient');
      router.push({
        pathname: '/send-confirm',
        params: {
          to: intent.to.phone,
          amount: paiseToAmountText(intent.amount),
          ...(intent.note ? { note: intent.note } : {}),
        },
      });
    } catch {
      toast.show(t('history.repeatFailed'), 'error');
    } finally {
      setRepeating(false);
    }
  };

  return (
    <ScrollView
      testID="txn-detail-screen"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <Stack gap="lg">
        <Text variant="caption" color="textMuted">
          {t('history.detail')}
        </Text>
        <Text variant="display" color={incoming ? 'success' : 'text'} testID="detail-amount">
          {incoming ? '+' : '-'}
          {formatPaise(txn.amount)}
        </Text>
        <Badge label={t(`history.status.${txn.status}`)} tone={STATUS_TONE[txn.status]} />
        <Card>
          <ListRow
            title={txn.counterparty?.name ?? t(`history.type.${txn.type}`)}
            subtitle={t('history.counterparty')}
          />
          <ListRow
            title={formatDate(txn.createdAt, getLanguage(), 'Asia/Kolkata', { withTime: true })}
            subtitle={t('history.date')}
          />
          <ListRow title={formatPaise(txn.fee)} subtitle={t('history.fee')} />
          <ListRow title={txn.id} subtitle={t('history.reference')} />
        </Card>
        <Input
          label={t('history.note')}
          placeholder={t('history.noteHint')}
          value={note}
          onChangeText={setNote}
          maxLength={140}
          testID="note-input"
        />
        <Button
          title={t('common.save')}
          onPress={() => void saveNote()}
          disabled={note.trim() === savedNote || savingNote}
          loading={savingNote}
          testID="save-note"
        />
        {canRepeat ? (
          <Button
            title={t('history.repeat')}
            variant="secondary"
            onPress={() => void repeat()}
            loading={repeating}
            testID="repeat-payment"
          />
        ) : null}
      </Stack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: 16 } });
