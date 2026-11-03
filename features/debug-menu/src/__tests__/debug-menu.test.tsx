import { fireEvent, screen } from '@testing-library/react-native';
import { appFlags, resetFlags } from '@pp/core-flags';
import { createLogger, createMemorySink, resetSink, setSink } from '@pp/core-logging';
import { createTestApp, renderWithApp } from '@pp/harness';
import {
  DebugMenuScreen,
  DebugToolsProvider,
  buildDevExpression,
  canOpenDebugMenu,
  type DebugTools,
} from '../index';

const setDev = (value: boolean) => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = value;
};

const open = async (tools: DebugTools = {}) => {
  const app = await createTestApp();
  appFlags.set('debugMenu', true);
  await renderWithApp(
    <DebugToolsProvider tools={tools}>
      <DebugMenuScreen />
    </DebugToolsProvider>,
    { app },
  );
  return app;
};

afterEach(() => {
  setDev(true);
  resetFlags();
  resetSink();
});

describe('access', () => {
  it('is closed when the flag is off', async () => {
    const { app } = await renderWithApp(<DebugMenuScreen />);
    expect(canOpenDebugMenu()).toBe(false);
    expect(screen.queryByTestId('debug-menu')).toBeNull();
    app.dispose();
  });

  it('is closed outside development builds even with the flag on', async () => {
    setDev(false);
    const app = await createTestApp();
    appFlags.set('debugMenu', true);
    await renderWithApp(<DebugMenuScreen />, { app });
    expect(canOpenDebugMenu()).toBe(false);
    expect(screen.queryByTestId('debug-menu')).toBeNull();
    app.dispose();
  });

  it('opens in development with the flag on', async () => {
    const app = await open();
    expect(canOpenDebugMenu()).toBe(true);
    expect(screen.getByTestId('debug-menu')).toBeTruthy();
    app.dispose();
  });
});

describe('panels', () => {
  it('toggles feature flags', async () => {
    const app = await open();
    await fireEvent(screen.getByTestId('flag-newSplitUi'), 'valueChange', true);
    expect(appFlags.get('newSplitUi')).toBe(true);
    await fireEvent.press(screen.getByTestId('flags-reset'));
    expect(appFlags.get('newSplitUi')).toBe(false);
    app.dispose();
  });

  it('drives the chaos handle', async () => {
    const chaos = {
      setLatency: jest.fn(),
      failNext: jest.fn(),
      timeoutNext: jest.fn(),
      dropResponse: jest.fn(),
      reset: jest.fn(),
    };
    const app = await open({ chaos });
    await fireEvent.press(screen.getByTestId('tab-chaos'));
    await fireEvent.press(screen.getByTestId('chaos-slow'));
    await fireEvent.press(screen.getByTestId('chaos-drop'));
    await fireEvent.press(screen.getByTestId('chaos-reset'));
    expect(chaos.setLatency).toHaveBeenCalledWith({ uplinkMs: 1500, downlinkMs: 1500 });
    expect(chaos.dropResponse).toHaveBeenCalledTimes(1);
    expect(chaos.reset).toHaveBeenCalledTimes(1);
    app.dispose();
  });

  it('explains when no mock backend is attached', async () => {
    const app = await open();
    await fireEvent.press(screen.getByTestId('tab-chaos'));
    expect(screen.getByText('No mock backend')).toBeTruthy();
    app.dispose();
  });

  it('lists recent log entries and shows the display-only expression', async () => {
    const logs = createMemorySink();
    setSink(logs);
    createLogger('demo').info('hello world');
    const app = await open({ logs });
    await fireEvent.press(screen.getByTestId('tab-logs'));
    await fireEvent.press(screen.getByTestId('log-row-0'));
    expect(screen.getByTestId('log-snippet')).toBeTruthy();
    expect(screen.getByText('eval("demo hello world")')).toBeTruthy();
    app.dispose();
  });

  it('shows redacted state', async () => {
    const app = await open();
    await fireEvent.press(screen.getByTestId('tab-state'));
    expect(screen.getByTestId('panel-state')).toBeTruthy();
    expect(screen.queryByText(/refreshToken/)).toBeNull();
    app.dispose();
  });
});

describe('buildDevExpression', () => {
  it('returns text only and is empty outside development', () => {
    expect(buildDevExpression(['a', 'b'])).toBe('eval("a b")');
    setDev(false);
    expect(buildDevExpression(['a'])).toBe('');
  });
});
