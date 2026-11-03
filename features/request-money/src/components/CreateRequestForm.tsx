import { useRef, useState } from 'react';
import type { Contact, Paise } from '@pp/contracts-domain';
import { useService } from '@pp/core-di';
import {
  AmountInput,
  Avatar,
  Button,
  Input,
  ListRow,
  Stack,
  Text,
  useToast,
} from '@pp/design-system';
import { createIntentId, REQUESTS_SERVICE } from '@pp/svc-requests';
import { copy } from '../copy';
import { sortContacts } from '../state/contacts';

export interface CreateRequestFormProps {
  contacts: Contact[];
  onCreated: () => void;
}

export function CreateRequestForm({ contacts, onCreated }: CreateRequestFormProps) {
  const requests = useService(REQUESTS_SERVICE);
  const toast = useToast();
  const [contactId, setContactId] = useState<Contact['id'] | null>(null);
  const [amountText, setAmountText] = useState('');
  const [amount, setAmount] = useState<Paise | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const intentId = useRef(createIntentId());

  const submit = () => {
    if (guard.current || contactId === null || amount === null) return;
    guard.current = true;
    setBusy(true);
    requests
      .create(
        { from: contactId, amount, ...(note.trim() ? { note: note.trim() } : {}) },
        { intentId: intentId.current },
      )
      .then(() => {
        toast.show(copy.sent, 'success');
        intentId.current = createIntentId();
        setAmountText('');
        setAmount(null);
        setNote('');
        setContactId(null);
        onCreated();
      })
      .catch(() => toast.show(copy.sendFailed, 'error'))
      .finally(() => {
        guard.current = false;
        setBusy(false);
      });
  };

  return (
    <Stack gap="md" testID="create-request-form">
      <Text variant="heading" accessibilityRole="header">
        {copy.newRequest}
      </Text>
      <Text variant="caption" color="textMuted">
        {copy.from}
      </Text>
      {sortContacts(contacts)
        .slice(0, 8)
        .map((contact) => (
          <ListRow
            key={contact.id}
            testID={`pick-${contact.id}`}
            title={contact.name}
            subtitle={contact.phone}
            left={<Avatar name={contact.name} color={contact.avatarColor} />}
            right={contact.id === contactId ? <Text color="success">✓</Text> : undefined}
            onPress={() => setContactId(contact.id)}
          />
        ))}
      <AmountInput
        label={copy.amount}
        value={amountText}
        onChangeValue={(raw, paise) => {
          setAmountText(raw);
          setAmount(paise);
        }}
      />
      <Input label={copy.note} value={note} onChangeText={setNote} maxLength={140} />
      <Button
        testID="create-request-submit"
        title={copy.send}
        loading={busy}
        disabled={busy || contactId === null || amount === null}
        onPress={submit}
      />
    </Stack>
  );
}
