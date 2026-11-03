import { View } from 'react-native';
import type { Contact } from '@pp/contracts-domain';
import { Avatar, EmptyState, ListRow, SectionHeader, Skeleton, Text } from '@pp/design-system';
import { copy } from '../copy';

export interface RecipientPickerProps {
  contacts: Contact[];
  loading: boolean;
  failed: boolean;
  selectedPhone: string | null;
  onPick: (contact: Contact) => void;
  onRetry: () => void;
}

export function RecipientPicker({
  contacts,
  loading,
  failed,
  selectedPhone,
  onPick,
  onRetry,
}: RecipientPickerProps) {
  if (loading && contacts.length === 0) return <Skeleton height={56} />;
  if (failed && contacts.length === 0) {
    return <EmptyState title={copy.contactsFailed} actionLabel="Try again" onAction={onRetry} />;
  }
  if (contacts.length === 0) return <EmptyState title={copy.noContacts} />;

  const favourites = contacts.filter((c) => c.favourite);
  const rest = contacts.filter((c) => !c.favourite);

  const row = (contact: Contact) => (
    <ListRow
      key={contact.id}
      testID={`contact-${contact.id}`}
      title={contact.name}
      subtitle={contact.phone}
      left={<Avatar name={contact.name} color={contact.avatarColor} />}
      right={contact.phone === selectedPhone ? <Text color="success">✓</Text> : undefined}
      onPress={() => onPick(contact)}
    />
  );

  return (
    <View>
      {favourites.length > 0 ? (
        <>
          <SectionHeader title={copy.favourites} />
          {favourites.map(row)}
        </>
      ) : null}
      <SectionHeader title={copy.recent} />
      {rest.map(row)}
    </View>
  );
}
