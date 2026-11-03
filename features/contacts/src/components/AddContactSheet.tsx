import { useState } from 'react';
import { Button, Input, Sheet, Stack } from '@pp/design-system';
import { useT } from '../hooks/useT';
import { normalizePhone } from '../state/search';

export interface AddContactSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: { name: string; phone: string }) => Promise<void>;
}

export function AddContactSheet({ visible, onClose, onSubmit }: AddContactSheetProps) {
  const t = useT();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const submit = async (): Promise<void> => {
    const trimmed = name.trim();
    const normalised = normalizePhone(phone);
    if (trimmed === '') return setError(t('contacts.nameRequired'));
    if (!normalised) return setError(t('contacts.invalidPhone'));
    setError(undefined);
    setBusy(true);
    try {
      await onSubmit({ name: trimmed, phone: normalised });
      setName('');
      setPhone('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('contacts.add')}>
      <Stack gap="md">
        <Input
          label={t('contacts.name')}
          value={name}
          onChangeText={setName}
          testID="contact-name"
        />
        <Input
          label={t('contacts.phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          error={error}
          testID="contact-phone"
        />
        <Button
          title={t('common.save')}
          onPress={() => void submit()}
          loading={busy}
          testID="contact-save"
        />
      </Stack>
    </Sheet>
  );
}
