import type { Coupon } from '@pp/contracts-domain';
import { formatDate, getLanguage, t } from '@pp/core-i18n';
import { Badge, Button, Card, Stack, Text } from '@pp/design-system';
import type { CouponView } from '../state/coupon-view';

export interface CouponCardProps {
  coupon: Coupon;
  view: CouponView;
  canRedeem: boolean;
  busy: boolean;
  onRedeem: (coupon: Coupon) => void;
}

export function CouponCard({ coupon, view, canRedeem, busy, onRedeem }: CouponCardProps) {
  return (
    <Card>
      <Stack gap="sm" testID={`coupon-${coupon.id}`}>
        <Stack direction="row" justify="space-between" align="center">
          <Text variant="heading">{coupon.title}</Text>
          <Badge label={view.label} tone={view.tone} />
        </Stack>
        <Text color="textMuted">{coupon.description}</Text>
        <Text variant="caption" color="textMuted">
          {coupon.code} ·{' '}
          {t('rewards.expires', { date: formatDate(coupon.expiresAt, getLanguage()) })}
        </Text>
        {canRedeem ? (
          <Button
            title={t('rewards.redeem')}
            loading={busy}
            testID={`redeem-${coupon.id}`}
            onPress={() => onRedeem(coupon)}
          />
        ) : null}
      </Stack>
    </Card>
  );
}
