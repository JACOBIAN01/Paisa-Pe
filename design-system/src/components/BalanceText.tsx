import type { Paise } from '@pp/contracts-domain';
import { formatPaise } from '@pp/core-money';
import { Text, type TextProps } from '../primitives/Text';

export interface BalanceTextProps extends Omit<TextProps, 'children'> {
  paise: Paise;
  masked?: boolean;
}

export const MASKED_BALANCE = '₹ ••••••';

export function BalanceText({
  paise,
  masked = false,
  variant = 'display',
  ...rest
}: BalanceTextProps) {
  const text = masked ? MASKED_BALANCE : formatPaise(paise);
  return (
    <Text
      variant={variant}
      accessibilityLabel={masked ? 'Balance hidden' : `Balance ${text}`}
      {...rest}
    >
      {text}
    </Text>
  );
}
