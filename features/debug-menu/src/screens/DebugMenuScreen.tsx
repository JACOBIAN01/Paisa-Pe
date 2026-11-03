import { useState } from 'react';
import { Button, Screen, Stack, Text } from '@pp/design-system';
import { ChaosPanel } from '../components/ChaosPanel';
import { FlagsPanel } from '../components/FlagsPanel';
import { LogsPanel } from '../components/LogsPanel';
import { StatePanel } from '../components/StatePanel';
import { useFlagSnapshot } from '../hooks/useFlagSnapshot';
import { canOpenDebugMenu } from '../state/dev-tools';

const PANELS = [
  { id: 'flags', title: 'Flags', Panel: FlagsPanel },
  { id: 'chaos', title: 'Chaos', Panel: ChaosPanel },
  { id: 'logs', title: 'Logs', Panel: LogsPanel },
  { id: 'state', title: 'State', Panel: StatePanel },
] as const;

type PanelId = (typeof PANELS)[number]['id'];

export function DebugMenuScreen() {
  useFlagSnapshot();
  const [active, setActive] = useState<PanelId>('flags');
  if (!canOpenDebugMenu()) return null;

  const current = PANELS.find((panel) => panel.id === active) ?? PANELS[0];
  return (
    <Screen scroll testID="debug-menu">
      <Stack gap="md">
        <Text variant="title">Debug menu</Text>
        <Text variant="caption" color="textMuted">
          Development builds only.
        </Text>
        <Stack direction="row" gap="sm">
          {PANELS.map((panel) => (
            <Button
              key={panel.id}
              testID={`tab-${panel.id}`}
              title={panel.title}
              variant={panel.id === active ? 'primary' : 'secondary'}
              onPress={() => setActive(panel.id)}
            />
          ))}
        </Stack>
        <current.Panel />
      </Stack>
    </Screen>
  );
}
