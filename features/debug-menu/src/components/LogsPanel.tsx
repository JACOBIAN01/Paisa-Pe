import { useState } from 'react';
import { Button, EmptyState, ListRow, Stack } from '@pp/design-system';
import { useDebugTools } from '../state/debug-tools';
import { buildDevExpression } from '../state/dev-tools';

const MAX_ROWS = 50;

export function LogsPanel() {
  const logs = useDebugTools()?.logs;
  const [, refresh] = useState(0);
  const [snippet, setSnippet] = useState('');

  if (!logs) {
    return (
      <EmptyState title="No log sink" message="The host app did not attach a memory log sink." />
    );
  }
  const rows = logs.entries.slice(-MAX_ROWS).reverse();
  return (
    <Stack gap="sm" testID="panel-logs">
      <Button
        testID="logs-refresh"
        title="Refresh"
        variant="secondary"
        onPress={() => refresh((n) => n + 1)}
      />
      {rows.length === 0 ? <EmptyState title="No log entries yet" /> : null}
      {rows.map((entry, index) => (
        <ListRow
          key={`${index}-${entry.namespace}`}
          testID={`log-row-${index}`}
          title={`[${entry.level}] ${entry.namespace}`}
          subtitle={entry.message}
          onPress={() => setSnippet(buildDevExpression([entry.namespace, entry.message]))}
        />
      ))}
      {snippet ? <ListRow testID="log-snippet" title="Expression" subtitle={snippet} /> : null}
    </Stack>
  );
}
