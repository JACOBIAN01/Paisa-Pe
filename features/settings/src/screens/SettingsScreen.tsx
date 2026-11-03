import { useState } from 'react';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useService } from '@pp/core-di';
import { t } from '@pp/core-i18n';
import {
  Button,
  Card,
  ConfirmDialog,
  Divider,
  ErrorBanner,
  ListRow,
  Screen,
  SectionHeader,
  Skeleton,
  Stack,
  Text,
  useToast,
} from '@pp/design-system';
import { AUTH_SERVICE } from '@pp/svc-auth';
import { LanguagePicker } from '../components/LanguagePicker';
import { ProfileHeader } from '../components/ProfileHeader';
import { ToggleRow } from '../components/ToggleRow';
import { useLanguage } from '../hooks/useLanguage';
import { useSettingsData } from '../hooks/useSettingsData';
import { SETTINGS_LINKS } from '../state/settings-model';

const appVersion = (): string => Constants.expoConfig?.version ?? '1.0.0';

export function SettingsScreen() {
  const router = useRouter();
  const auth = useService(AUTH_SERVICE);
  const toast = useToast();
  const language = useLanguage();
  const { status, user, preferences, saving, saveFailed, reload, update } = useSettingsData();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    setLoggingOut(true);
    try {
      await auth.logout();
      setConfirmLogout(false);
      router.replace('/');
    } catch {
      toast.show(t('error.generic'), 'error');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Screen scroll testID="settings-screen">
      <Stack gap="lg">
        <Text variant="title">{t('settings.title')}</Text>

        {status === 'loading' ? <Skeleton height={72} /> : null}
        {status === 'error' ? (
          <ErrorBanner message={t('settings.loadFailed')} onRetry={reload} />
        ) : null}
        {saveFailed ? <ErrorBanner message={t('settings.saveFailed')} /> : null}

        {user ? <ProfileHeader user={user} /> : null}

        {preferences ? (
          <Card>
            <SectionHeader title={t('settings.section.preferences')} />
            <Text variant="caption" color="textMuted">
              {t('settings.language')}
            </Text>
            <LanguagePicker
              value={language}
              disabled={saving}
              onChange={(next) => void update({ language: next })}
            />
            <Divider />
            <ToggleRow
              testID="toggle-hide-balance"
              title={t('settings.hideBalance')}
              value={preferences.hideBalance}
              disabled={saving}
              onChange={(hideBalance) => void update({ hideBalance })}
            />
            <ToggleRow
              testID="toggle-notifications"
              title={t('settings.notifications')}
              value={preferences.pushEnabled}
              disabled={saving}
              onChange={(pushEnabled) => void update({ pushEnabled })}
            />
          </Card>
        ) : null}

        <Card>
          <SectionHeader title={t('settings.section.account')} />
          {SETTINGS_LINKS.map((link) => (
            <ListRow
              key={link.route}
              testID={`settings-link-${link.route.slice(1)}`}
              title={t(link.labelKey)}
              right={<Text color="textMuted">›</Text>}
              onPress={() => router.push(link.route)}
            />
          ))}
        </Card>

        <Button
          testID="logout-button"
          title={t('auth.logout')}
          variant="danger"
          onPress={() => setConfirmLogout(true)}
        />
        <Text variant="caption" color="textMuted" testID="app-version">
          {t('settings.version', { version: appVersion() })}
        </Text>
      </Stack>

      <ConfirmDialog
        visible={confirmLogout}
        title={t('settings.logoutTitle')}
        message={t('settings.logoutMessage')}
        confirmLabel={t('auth.logout')}
        cancelLabel={t('common.cancel')}
        destructive
        busy={loggingOut}
        onConfirm={() => void logout()}
        onCancel={() => setConfirmLogout(false)}
      />
    </Screen>
  );
}
