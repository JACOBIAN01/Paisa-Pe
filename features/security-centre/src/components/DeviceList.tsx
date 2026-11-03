import { useState } from 'react';
import { Badge, ConfirmDialog, ListRow, SectionHeader, Text } from '@pp/design-system';
import { t } from '@pp/core-i18n';
import type { Device } from '@pp/contracts-domain';

interface Props {
  devices: Device[] | null;
  onRevoke: (deviceId: string) => Promise<void>;
}

export function DeviceList({ devices, onRevoke }: Props) {
  const [pending, setPending] = useState<Device | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async (): Promise<void> => {
    if (!pending) return;
    setBusy(true);
    await onRevoke(pending.id);
    setBusy(false);
    setPending(null);
  };

  return (
    <>
      <SectionHeader title={t('security.devices')} />
      {devices === null ? <Text color="textMuted">{t('common.loading')}</Text> : null}
      {devices?.map((device) => (
        <ListRow
          key={device.id}
          testID={`device-${device.id}`}
          title={device.name}
          subtitle={`${device.platform === 'ios' ? 'iPhone' : 'Android'} · last active ${new Date(device.lastActiveAt).toLocaleDateString('en-IN')}`}
          right={
            device.current ? (
              <Badge label={t('security.thisDevice')} tone="success" />
            ) : (
              <Text color="danger" onPress={() => setPending(device)} accessibilityRole="button">
                {t('security.revoke')}
              </Text>
            )
          }
        />
      ))}
      <ConfirmDialog
        visible={pending !== null}
        title={t('security.revoke')}
        message={`${pending?.name ?? 'This device'} will be signed out immediately.`}
        destructive
        busy={busy}
        onConfirm={() => void confirm()}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
