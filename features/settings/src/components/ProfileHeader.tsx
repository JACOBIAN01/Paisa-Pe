import type { User } from '@pp/contracts-domain';
import { Avatar, Badge, Stack, Text } from '@pp/design-system';
import { t } from '@pp/core-i18n';
import { kycTierLabel } from '../state/settings-model';

export function ProfileHeader({ user }: { user: User }) {
  return (
    <Stack direction="row" gap="md" align="center" testID="settings-profile">
      <Avatar name={user.name} size={56} />
      <Stack gap="xs">
        <Text variant="heading">{user.name}</Text>
        <Text variant="caption" color="textMuted">
          {user.phone}
        </Text>
        <Badge label={t('settings.kycTier', { tier: kycTierLabel(user.kycTier) })} tone="neutral" />
      </Stack>
    </Stack>
  );
}
