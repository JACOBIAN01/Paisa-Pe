import { Switch } from 'react-native';
import { appFlags, type AppFlagValues } from '@pp/core-flags';
import { Button, ListRow, Stack } from '@pp/design-system';
import { useFlagSnapshot } from '../hooks/useFlagSnapshot';

export function FlagsPanel() {
  const flags = useFlagSnapshot();
  const names = Object.keys(flags) as Array<keyof AppFlagValues>;
  return (
    <Stack gap="sm" testID="panel-flags">
      {names.map((name) => (
        <ListRow
          key={name}
          title={name}
          right={
            <Switch
              testID={`flag-${name}`}
              accessibilityLabel={`Flag ${name}`}
              value={flags[name]}
              onValueChange={(next) => appFlags.set(name, next)}
            />
          }
        />
      ))}
      <Button
        testID="flags-reset"
        title="Clear overrides"
        variant="secondary"
        onPress={() => appFlags.clearOverrides()}
      />
    </Stack>
  );
}
