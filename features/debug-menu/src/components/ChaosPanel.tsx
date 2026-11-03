import { Button, EmptyState, Stack, Text } from '@pp/design-system';
import { useDebugTools } from '../state/debug-tools';

export function ChaosPanel() {
  const chaos = useDebugTools()?.chaos;
  if (!chaos) {
    return (
      <EmptyState
        title="No mock backend"
        message="Chaos controls are only available when the app runs against the in-process mock platform."
      />
    );
  }
  return (
    <Stack gap="sm" testID="panel-chaos">
      <Text variant="caption" color="textMuted">
        Applies to the next matching request only unless noted.
      </Text>
      <Button
        testID="chaos-slow"
        title="Slow network (1.5s each way)"
        variant="secondary"
        onPress={() => chaos.setLatency({ uplinkMs: 1500, downlinkMs: 1500 })}
      />
      <Button
        testID="chaos-fail"
        title="Fail next request"
        variant="secondary"
        onPress={() => chaos.failNext()}
      />
      <Button
        testID="chaos-timeout"
        title="Time out next request"
        variant="secondary"
        onPress={() => chaos.timeoutNext()}
      />
      <Button
        testID="chaos-drop"
        title="Drop next response"
        variant="secondary"
        onPress={() => chaos.dropResponse()}
      />
      <Button
        testID="chaos-reset"
        title="Reset chaos"
        variant="ghost"
        onPress={() => chaos.reset()}
      />
    </Stack>
  );
}
