import { useCallback, useEffect, useState } from 'react';
import type { BillDue, BillerId, Paise } from '@pp/contracts-domain';
import { appAnalytics } from '@pp/core-analytics';
import { t } from '@pp/core-i18n';
import { formatPaise } from '@pp/core-money';
import { keys, useQueryClient } from '@pp/core-query';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  ListRow,
  Screen,
  SectionHeader,
  Skeleton,
  Stack,
  Text,
  useToast,
} from '@pp/design-system';
import { DueCard } from '../components/DueCard';
import { RechargeForm } from '../components/RechargeForm';
import { useBills } from '../hooks/useBills';
import { useIntentIds } from '../hooks/useIntentIds';
import { dueKey, groupByCategory, RECHARGE_CATEGORIES, type BillsTab } from '../state/bill-view';
import { describeError } from '../state/errors';

const TABS: Array<{ id: BillsTab; label: () => string }> = [
  { id: 'dues', label: () => t('bills.dues') },
  { id: 'billers', label: () => t('bills.billers') },
  { id: 'recharge', label: () => t('bills.recharge') },
];

export function BillsScreen() {
  const toast = useToast();
  const client = useQueryClient();
  const { userId, bills, billers, dues } = useBills();
  const intents = useIntentIds();
  const [tab, setTab] = useState<BillsTab>('dues');
  const [paying, setPaying] = useState<BillDue | null>(null);
  const [busy, setBusy] = useState(false);
  const [autopay, setAutopay] = useState<Record<string, boolean>>({});

  useEffect(() => {
    appAnalytics.trackEvent({ name: 'screen_viewed', props: { route: 'bills' } });
  }, []);

  const billerList = billers.data ?? [];
  const dueList = dues.data ?? [];
  const nameOf = (id: BillerId): string => billerList.find((b) => b.id === id)?.name ?? id;

  const afterPayment = useCallback(async () => {
    client.invalidate(keys.balance(userId));
    await dues.refetch();
  }, [client, userId, dues]);

  const confirmPay = async () => {
    if (!paying || busy) return;
    const due = paying;
    const signature = `pay:${dueKey(due)}`;
    setBusy(true);
    try {
      const result = await bills.pay(due, { intentId: intents.idFor(signature) });
      intents.settle(signature);
      const category = billerList.find((b) => b.id === due.billerId)?.category ?? 'other';
      appAnalytics.trackEvent({ name: 'bill_paid', props: { category } });
      toast.show(
        result.comparison.matches
          ? t('bills.paid')
          : `${t('bills.paid')} · ${formatPaise(result.txn.amount)}`,
        'success',
      );
      setPaying(null);
      await afterPayment();
    } catch (error) {
      toast.show(describeError(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleAutopay = async (due: BillDue, enabled: boolean) => {
    const key = dueKey(due);
    setAutopay((prev) => ({ ...prev, [key]: enabled }));
    try {
      await bills.setAutopay({
        billerId: due.billerId,
        accountRef: due.accountRef,
        maxAmount: bills.totalFor(due).total,
        enabled,
      });
    } catch (error) {
      setAutopay((prev) => ({ ...prev, [key]: !enabled }));
      toast.show(describeError(error), 'error');
    }
  };

  const recharge = async (input: { billerId: BillerId; accountRef: string; amount: Paise }) => {
    const signature = `recharge:${input.billerId}:${input.accountRef}:${input.amount}`;
    setBusy(true);
    try {
      await bills.recharge(input.billerId, input.accountRef, input.amount, {
        intentId: intents.idFor(signature),
      });
      intents.settle(signature);
      toast.show(t('bills.rechargeDone'), 'success');
      client.invalidate(keys.balance(userId));
    } catch (error) {
      toast.show(describeError(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  const loading = dues.data === undefined && dues.status !== 'error';
  const failed = dues.status === 'error' && dues.data === undefined;
  const breakdown = paying ? bills.totalFor(paying) : null;

  return (
    <Screen scroll>
      <Text variant="title" accessibilityRole="header">
        {t('bills.title')}
      </Text>
      <Stack direction="row" gap="sm">
        {TABS.map((item) => (
          <Button
            key={item.id}
            title={item.label()}
            testID={`tab-${item.id}`}
            variant={tab === item.id ? 'primary' : 'ghost'}
            onPress={() => setTab(item.id)}
          />
        ))}
      </Stack>

      {failed ? <ErrorBanner message={t('bills.loadError')} onRetry={dues.refetch} /> : null}
      {loading ? <Skeleton height={160} /> : null}

      {tab === 'dues' ? (
        <Stack gap="md">
          {dues.data !== undefined && dueList.length === 0 ? (
            <EmptyState title={t('bills.empty')} />
          ) : null}
          {dueList.map((due) => (
            <DueCard
              key={dueKey(due)}
              due={due}
              billerName={nameOf(due.billerId)}
              total={bills.totalFor(due)}
              autopay={autopay[dueKey(due)] ?? false}
              onPay={setPaying}
              onToggleAutopay={toggleAutopay}
            />
          ))}
        </Stack>
      ) : null}

      {tab === 'billers' ? (
        <Stack gap="md">
          {groupByCategory(billerList).map(([category, list]) => (
            <Stack key={category} gap="sm">
              <SectionHeader title={t(`bills.category.${category}`)} />
              {list.map((biller) => (
                <ListRow key={biller.id} title={biller.name} testID={`biller-${biller.id}`} />
              ))}
            </Stack>
          ))}
        </Stack>
      ) : null}

      {tab === 'recharge' ? (
        <RechargeForm
          billers={billerList.filter((b) => RECHARGE_CATEGORIES.includes(b.category))}
          busy={busy}
          onSubmit={recharge}
        />
      ) : null}

      <ConfirmDialog
        visible={paying !== null}
        title={t('bills.pay')}
        message={
          paying && breakdown
            ? `${nameOf(paying.billerId)}\n${t('bills.subtotal')}: ${formatPaise(breakdown.subtotal)}\n${t('bills.fee')}: ${formatPaise(breakdown.fee)}\n${t('bills.total')}: ${formatPaise(breakdown.total)}`
            : ''
        }
        confirmLabel={t('common.continue')}
        busy={busy}
        onConfirm={confirmPay}
        onCancel={() => setPaying(null)}
      />
    </Screen>
  );
}
