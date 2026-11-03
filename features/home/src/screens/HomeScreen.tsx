import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useService } from '@pp/core-di';
import { tn } from '@pp/core-i18n';
import type { RouteName } from '@pp/contracts-domain';
import { Badge, ErrorBanner, Stack, Text, useTheme } from '@pp/design-system';
import { useIsOnline } from '@pp/platform-connectivity';
import { useAuthState } from '@pp/svc-auth';
import { LEDGER, useLedgerState } from '@pp/svc-ledger';
import { BalanceCard } from '../components/BalanceCard';
import { OfflineBanner } from '../components/OfflineBanner';
import { QuickActions } from '../components/QuickActions';
import { RecentActivity } from '../components/RecentActivity';
import { useHomeProfile } from '../hooks/useHomeProfile';
import { useHomeRefresh } from '../hooks/useHomeRefresh';
import { usePendingRequests } from '../hooks/usePendingRequests';
import { useRecentTxns } from '../hooks/useRecentTxns';
import { useT } from '../hooks/useT';
import { isBalanceMasked, useBalanceVisibility } from '../state/balance-visibility';

const RECENT_COUNT = 5;

export function HomeScreen() {
  const t = useT();
  const router = useRouter();
  const { colors } = useTheme();
  const { activeUserId } = useAuthState();
  const ledger = useService(LEDGER);
  useLedgerState();
  const online = useIsOnline();
  const { name, hideBalance } = useHomeProfile(activeUserId);
  const { refreshing, failed, refresh } = useHomeRefresh();
  const txns = useRecentTxns(RECENT_COUNT);
  const pending = usePendingRequests();
  const revealed = useBalanceVisibility((s) => s.revealed);
  const toggle = useBalanceVisibility((s) => s.toggle);
  const masked = isBalanceMasked(hideBalance, revealed);

  const open = useCallback((route: RouteName) => router.push(`/${route}`), [router]);

  return (
    <ScrollView
      testID="home-screen"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
    >
      <Stack gap="lg">
        <Text variant="title">{t('home.greeting', { name: name || '…' })}</Text>
        {online ? null : <OfflineBanner />}
        {failed ? (
          <ErrorBanner message={t('home.refreshFailed')} onRetry={() => void refresh()} />
        ) : null}
        <BalanceCard
          balance={ledger.projectedBalance()}
          masked={masked}
          onToggleMask={() => toggle(masked)}
        />
        {pending > 0 ? <Badge label={tn('home.pendingRequests', pending)} tone="warning" /> : null}
        <QuickActions onOpen={open} />
        <RecentActivity
          txns={txns}
          onOpenTxn={(id) => router.push({ pathname: '/txn-detail', params: { id } })}
          onSeeAll={() => open('history')}
        />
      </Stack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: 16 } });
