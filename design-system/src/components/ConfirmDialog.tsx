import { StyleSheet, View } from 'react-native';
import { spacing } from '../tokens/layout';
import { Button } from '../primitives/Button';
import { Text } from '../primitives/Text';
import { Sheet } from './Sheet';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Sheet visible={visible} onClose={onCancel} title={title}>
      <Text variant="body" color="textMuted">
        {message}
      </Text>
      <View style={styles.actions}>
        <Button title={cancelLabel} variant="secondary" onPress={onCancel} disabled={busy} />
        <Button
          title={confirmLabel}
          variant={destructive ? 'danger' : 'primary'}
          onPress={onConfirm}
          loading={busy}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md },
});
