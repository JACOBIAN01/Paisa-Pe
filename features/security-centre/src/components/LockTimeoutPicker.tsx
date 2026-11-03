import { ListRow, SectionHeader, Text } from '@pp/design-system';
import { t } from '@pp/core-i18n';
import type { Preferences } from '@pp/contracts-domain';
import { TIMEOUT_OPTIONS } from '../state/timeouts';

interface Props {
  value: Preferences['lockTimeoutSec'] | undefined;
  onChange: (seconds: Preferences['lockTimeoutSec']) => void;
}

export function LockTimeoutPicker({ value, onChange }: Props) {
  return (
    <>
      <SectionHeader title="Auto-lock" />
      {TIMEOUT_OPTIONS.map((option) => (
        <ListRow
          key={option.seconds}
          testID={`timeout-${option.seconds}`}
          title={t(option.label)}
          onPress={() => onChange(option.seconds)}
          right={option.seconds === value ? <Text color="primary">✓</Text> : undefined}
        />
      ))}
    </>
  );
}
