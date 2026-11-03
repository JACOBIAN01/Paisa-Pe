import type { SplitMode } from '@pp/svc-requests';
import { Button, Stack } from '@pp/design-system';
import { copy } from '../copy';

const MODES: SplitMode[] = ['equal', 'custom', 'percent'];

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: SplitMode;
  onChange: (m: SplitMode) => void;
}) {
  return (
    <Stack direction="row" gap="sm">
      {MODES.map((m) => (
        <Button
          key={m}
          testID={`mode-${m}`}
          title={copy.modes[m]}
          variant={m === mode ? 'primary' : 'secondary'}
          onPress={() => onChange(m)}
        />
      ))}
    </Stack>
  );
}
