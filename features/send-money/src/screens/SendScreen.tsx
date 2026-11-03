import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import type { Contact, Paise } from '@pp/contracts-domain';
import { t } from '@pp/core-i18n';
import { AmountInput, Button, Input, Screen, Stack, Text } from '@pp/design-system';
import { RecipientPicker } from '../components/RecipientPicker';
import { RiskBanner } from '../components/RiskBanner';
import { copy } from '../copy';
import { useContacts } from '../hooks/useContacts';
import { useSendDraft } from '../hooks/useSendDraft';
import { digitsOnly, toAmountParam } from '../state/amount';

export function SendScreen() {
  const router = useRouter();
  const { contacts, loading, failed, reload } = useContacts();
  const [digits, setDigits] = useState('');
  const [amountText, setAmountText] = useState('');
  const [amount, setAmount] = useState<Paise | null>(null);
  const [note, setNote] = useState('');
  const draft = useSendDraft(digits, amount, contacts);

  const pickContact = useCallback((contact: Contact) => {
    setDigits(digitsOnly(contact.phone.replace('+91', '')));
  }, []);

  const review = useCallback(() => {
    if (!draft.phone || amount === null || draft.blocked) return;
    router.push({
      pathname: '/send-confirm',
      params: {
        to: draft.phone,
        amount: toAmountParam(amount),
        ...(note.trim() ? { note: note.trim() } : {}),
      },
    });
  }, [draft.phone, draft.blocked, amount, note, router]);

  const canReview = draft.phone !== null && amount !== null && !draft.blocked;

  return (
    <Screen scroll testID="send-screen">
      <Stack gap="md">
        <Text variant="title" accessibilityRole="header">
          {t('send.title')}
        </Text>
        <Input
          label={copy.recipientLabel}
          value={digits}
          onChangeText={(text) => setDigits(digitsOnly(text))}
          keyboardType="phone-pad"
          placeholder={copy.recipientHint}
          maxLength={10}
          testID="recipient-input"
        />
        <RecipientPicker
          contacts={contacts}
          loading={loading}
          failed={failed}
          selectedPhone={draft.phone}
          onPick={pickContact}
          onRetry={reload}
        />
        <AmountInput
          label={t('send.amount')}
          value={amountText}
          onChangeValue={(raw, paise) => {
            setAmountText(raw);
            setAmount(paise);
          }}
          error={draft.overBalance ? copy.amountOverBalance : undefined}
        />
        <Input
          label={t('send.note')}
          value={note}
          onChangeText={setNote}
          placeholder={t('send.notePlaceholder')}
          maxLength={140}
          testID="note-input"
        />
        <RiskBanner prompts={draft.prompts} />
        <Button
          title={t('send.review')}
          onPress={review}
          disabled={!canReview}
          testID="review-button"
        />
      </Stack>
    </Screen>
  );
}
