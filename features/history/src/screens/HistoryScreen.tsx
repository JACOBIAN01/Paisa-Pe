import { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Txn } from '@pp/contracts-domain';
import { getLanguage, tn } from '@pp/core-i18n';
import { Button, EmptyState, ErrorBanner, Input, Text, useTheme } from '@pp/design-system';
import { ChipRow } from '../components/FilterBar';
import { TxnRow } from '../components/TxnRow';
import { useT } from '../hooks/useT';
import { PAGE_SIZE, useTxnFeed } from '../hooks/useTxnFeed';
import { GROUP_OPTIONS, STATUS_OPTIONS } from '../state/filters';

export function HistoryScreen() {
  const t = useT();
  const router = useRouter();
  const { colors } = useTheme();
  const feed = useTxnFeed();
  const language = getLanguage();

  const open = useCallback(
    (id: string) => router.push({ pathname: '/txn-detail', params: { id } }),
    [router],
  );
  const renderItem = useCallback(
    ({ item }: { item: Txn }) => <TxnRow txn={item} language={language} onPress={open} />,
    [language, open],
  );

  const header = (
    <View style={styles.header}>
      <Text variant="title">{t('history.title')}</Text>
      <Input
        label={t('history.search')}
        value={feed.filter.query}
        onChangeText={(query) => feed.setFilter({ query })}
        autoCapitalize="none"
        returnKeyType="search"
        testID="history-search"
      />
      <ChipRow
        options={GROUP_OPTIONS}
        selected={feed.filter.group}
        onSelect={(group) => feed.setFilter({ group })}
        testIdPrefix="group"
      />
      <ChipRow
        options={STATUS_OPTIONS}
        selected={feed.filter.status}
        onSelect={(status) => feed.setFilter({ status })}
        testIdPrefix="status"
      />
      {feed.failed ? (
        <ErrorBanner message={t('history.loadError')} onRetry={() => void feed.refresh()} />
      ) : null}
      <Text variant="caption" color="textMuted">
        {tn('history.count', feed.total)}
      </Text>
    </View>
  );

  const searching =
    feed.filter.query !== '' || feed.filter.group !== 'all' || feed.filter.status !== 'all';

  return (
    <FlatList
      testID="history-screen"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      data={feed.items}
      keyExtractor={(txn) => txn.id}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={
        feed.refreshing ? null : (
          <EmptyState title={searching ? t('history.noResults') : t('history.empty')} />
        )
      }
      ListFooterComponent={
        feed.hasMore ? (
          <Button
            title={t('history.loadMore')}
            variant="secondary"
            onPress={feed.loadMore}
            testID="load-more"
          />
        ) : null
      }
      initialNumToRender={PAGE_SIZE}
      onEndReached={feed.hasMore ? feed.loadMore : undefined}
      onEndReachedThreshold={0.4}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={feed.refreshing} onRefresh={() => void feed.refresh()} />
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  header: { gap: 12, paddingBottom: 8 },
});
