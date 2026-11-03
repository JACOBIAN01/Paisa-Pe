import { DebugMenuScreen, DebugToolsProvider } from '@pp/feat-debug-menu';
import { useRuntime } from '../src/runtime';

export default function DebugRoute() {
  const runtime = useRuntime();
  const chaos = runtime.mockServer?.chaos;
  return (
    <DebugToolsProvider tools={chaos ? { chaos } : {}}>
      <DebugMenuScreen />
    </DebugToolsProvider>
  );
}
