import { useCallback, useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Contact } from '@pp/contracts-domain';
import {
  Avatar,
  Button,
  EmptyState,
  ErrorBanner,
  Input,
  ListRow,
  SectionHeader,
  Text,
  useDisclosure,
  useTheme,
  useToast,
} from '@pp/design-system';
import { useAuthState } from '@pp/svc-auth';
import { AddContactSheet } from '../components/AddContactSheet';
import { useContacts } from '../hooks/useContacts';
import { useT } from '../hooks/useT';
import { useContactPickerStore } from '../state/picker';
import { searchContacts, sectionContacts } from '../state/search';

export function ContactsScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const picking = mode === 'pick';
  const { activeUserId } = useAuthState();
  const { contacts, loading, failed, refetch, add } = useContacts(activeUserId);
  const select = useContactPickerStore((s) => s.select);
  const [query, setQuery] = useState('');
  const sheet = useDisclosure();

  const matches = useMemo(() => searchContacts(contacts, query), [contacts, query]);
  const sections = useMemo(() => sectionContacts(matches), [matches]);

  const choose = useCallback(
    (contact: Contact) => {
      if (picking) {
        select(contact);
        router.back();
      } else {
        router.push({ pathname: '/send', params: { to: contact.phone } });
      }
    },
    [picking, select, router],
  );

  const create = async (input: { name: string; phone: string }): Promise<void> => {
    try {
      await add(input);
      toast.show(t('contacts.saved'), 'success');
      sheet.close();
    } catch {
      toast.show(t('contacts.saveFailed'), 'error');
    }
  };

  return (
    <View testID="contacts-screen" style={[styles.fill, { backgroundColor: colors.background }]}>
      <SectionList
        contentContainerStyle={styles.content}
        sections={sections}
        keyExtractor={(contact) => contact.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="title">{t('contacts.title')}</Text>
            <Input
              label={t('contacts.search')}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              testID="contacts-search"
            />
            {failed ? (
              <ErrorBanner message={t('contacts.loadError')} onRetry={() => void refetch()} />
            ) : null}
            <Button
              title={t('contacts.add')}
              variant="secondary"
              onPress={sheet.open}
              testID="add-contact"
            />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <SectionHeader
            title={section.key === 'favourites' ? t('contacts.favourites') : t('contacts.all')}
          />
        )}
        renderItem={({ item }) => (
          <ListRow
            testID={`contact-${item.id}`}
            title={item.name}
            subtitle={item.phone}
            left={<Avatar name={item.name} color={item.avatarColor} />}
            onPress={() => choose(item)}
          />
        )}
        ListEmptyComponent={
          loading || failed ? null : (
            <EmptyState title={query === '' ? t('contacts.empty') : t('contacts.noMatch')} />
          )
        }
      />
      <AddContactSheet visible={sheet.isOpen} onClose={sheet.close} onSubmit={create} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 16 },
  header: { gap: 12, paddingBottom: 8 },
});
