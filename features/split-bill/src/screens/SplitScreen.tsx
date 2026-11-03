import { useCallback, useRef, useState } from 'react';
import { Switch } from 'react-native';
import { useRouter } from 'expo-router';
import type { Contact, Paise } from '@pp/contracts-domain';
import { useService } from '@pp/core-di';
import { t } from '@pp/core-i18n';
import {
  AmountInput,
  Avatar,
  Button,
  EmptyState,
  ErrorBanner,
  Input,
  ListRow,
  Screen,
  SectionHeader,
  Stack,
  Text,
  useToast,
} from '@pp/design-system';
import { createIntentId, REQUESTS_SERVICE, type SplitMode } from '@pp/svc-requests';
import { ModeToggle } from '../components/ModeToggle';
import { ParticipantRow } from '../components/ParticipantRow';
import { copy } from '../copy';
import { useContacts } from '../hooks/useContacts';
import { useSplitPlan } from '../hooks/useSplitPlan';
import { sortContacts } from '../state/contacts';

export function SplitScreen() {
  const router = useRouter();
  const requests = useService(REQUESTS_SERVICE);
  const toast = useToast();
  const { contacts, failed, reload } = useContacts();
  const [totalText, setTotalText] = useState('');
  const [total, setTotal] = useState<Paise | null>(null);
  const [mode, setMode] = useState<SplitMode>('equal');
  const [includeSelf, setIncludeSelf] = useState(true);
  const [selected, setSelected] = useState<Contact['id'][]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const intentId = useRef(createIntentId());

  const { participants, plan, problem } = useSplitPlan({
    total,
    mode,
    includeSelf,
    selected,
    values,
  });

  const toggle = useCallback((id: Contact['id']) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }, []);

  const setValue = useCallback((ref: string, text: string) => {
    setValues((current) => ({ ...current, [ref]: text }));
  }, []);

  const create = useCallback(() => {
    if (guard.current || total === null || !plan || selected.length === 0) return;
    guard.current = true;
    setBusy(true);
    requests
      .createSplit({
        total,
        participants,
        mode,
        intentId: intentId.current,
        ...(note.trim() ? { note: note.trim() } : {}),
      })
      .then(() => {
        toast.show(copy.created, 'success');
        intentId.current = createIntentId();
        router.replace('/request');
      })
      .catch(() => toast.show(copy.createFailed, 'error'))
      .finally(() => {
        guard.current = false;
        setBusy(false);
      });
  }, [requests, total, plan, selected, participants, mode, note, toast, router]);

  const shareOf = (ref: string): Paise | null =>
    plan?.parts.find((p) => p.ref === ref)?.share ?? null;
  const nameOf = (ref: string): string =>
    ref === 'self' ? copy.you : (contacts.find((c) => c.id === ref)?.name ?? ref);
  const uneven =
    mode === 'equal' && plan !== null && new Set(plan.parts.map((p) => p.share)).size > 1;

  return (
    <Screen scroll testID="split-screen">
      <Stack gap="md">
        <Text variant="title" accessibilityRole="header">
          {t('split.title')}
        </Text>
        <AmountInput
          label={t('split.total')}
          value={totalText}
          onChangeValue={(raw, paise) => {
            setTotalText(raw);
            setTotal(paise);
          }}
        />
        <ModeToggle mode={mode} onChange={setMode} />
        <Stack direction="row" gap="sm">
          <Switch
            testID="include-self"
            accessibilityLabel={copy.includeMe}
            value={includeSelf}
            onValueChange={setIncludeSelf}
          />
          <Text>{copy.includeMe}</Text>
        </Stack>

        <SectionHeader title={t('split.participants')} />
        {failed && contacts.length === 0 ? (
          <ErrorBanner message={copy.contactsFailed} onRetry={reload} />
        ) : contacts.length === 0 ? (
          <EmptyState title={copy.noContacts} />
        ) : (
          sortContacts(contacts).map((contact) => (
            <ListRow
              key={contact.id}
              testID={`split-pick-${contact.id}`}
              title={contact.name}
              subtitle={contact.phone}
              left={<Avatar name={contact.name} color={contact.avatarColor} />}
              right={selected.includes(contact.id) ? <Text color="success">✓</Text> : undefined}
              onPress={() => toggle(contact.id)}
            />
          ))
        )}

        {participants.length > 0 ? <SectionHeader title={copy.preview} /> : null}
        {participants.map((p) => (
          <ParticipantRow
            key={p.ref}
            refId={p.ref}
            name={nameOf(p.ref)}
            mode={mode}
            value={values[p.ref] ?? ''}
            share={shareOf(p.ref)}
            onChangeValue={setValue}
          />
        ))}
        {uneven ? (
          <Text variant="caption" color="textMuted" testID="remainder-note">
            {t('split.remainderNote')}
          </Text>
        ) : null}
        {problem && total !== null ? <ErrorBanner message={problem} /> : null}

        <Input label={copy.note} value={note} onChangeText={setNote} maxLength={140} />
        <Button
          testID="split-submit"
          title={t('split.send')}
          loading={busy}
          disabled={busy || !plan || selected.length === 0}
          onPress={create}
        />
        {selected.length === 0 && total !== null ? (
          <Text variant="caption" color="textMuted">
            {copy.pickSomeone}
          </Text>
        ) : null}
      </Stack>
    </Screen>
  );
}
