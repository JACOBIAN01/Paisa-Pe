import { act, screen } from '@testing-library/react-native';
import { createMemorySink, resetSink, setSink } from '@pp/core-logging';
import { HelpScreen } from '@pp/feat-help-centre';
import { createNav, createTestApp, renderWithApp } from '@pp/harness';

const mockNav = createNav('/help');
const mockInject = jest.fn();
const mockWebView: { props: Record<string, (...args: never[]) => unknown> } = { props: {} };

jest.mock('expo-router', () => ({
  useRouter: () => mockNav.router,
  useLocalSearchParams: () => mockNav.params(),
}));
jest.mock('react-native-webview', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const WebView = React.forwardRef((props: Record<string, never>, ref: unknown) => {
    mockWebView.props = props;
    React.useImperativeHandle(ref, () => ({ injectJavaScript: mockInject }));
    return React.createElement(View, { testID: props.testID });
  });
  return { WebView };
});

const ARTICLE = 'https://help.paisape.app/article/1';
const message = (type: string, payload: object = {}) => ({ v: 1, id: 'm1', type, payload });
const post = async (body: unknown, url = ARTICLE): Promise<void> => {
  const data = typeof body === 'string' ? body : JSON.stringify(body);
  await act(async () => {
    mockWebView.props.onMessage?.({ nativeEvent: { data, url } } as never);
  });
};
let mark = 0;
/** Screens opened since the test began. */
const opened = () =>
  mockNav
    .trail()
    .slice(mark)
    .map((location) => location.path);

beforeEach(() => {
  setSink(createMemorySink());
  mockInject.mockClear();
  mockNav.router.replace('/help');
  mark = mockNav.trail().length;
});
afterEach(() => resetSink());

describe('scenario: the help centre talks to the app', () => {
  it('loads only the help origin inside the WebView', async () => {
    const app = await createTestApp();
    await renderWithApp(<HelpScreen />, { app });
    expect(mockWebView.props.source).toEqual({ uri: 'https://help.paisape.app/app' });
    const allow = mockWebView.props.onShouldStartLoadWithRequest as unknown as (r: {
      url: string;
    }) => boolean;
    expect(allow({ url: 'https://help.paisape.app/article/2' } as never)).toBe(true);
    expect(allow({ url: 'https://evil.example/login' } as never)).toBe(false);
    await screen.unmount();
    app.dispose();
  });

  it('opens a settings screen when the page asks from the help origin', async () => {
    const app = await createTestApp();
    await renderWithApp(<HelpScreen />, { app });
    await post(message('navigate', { route: 'settings' }));
    expect(mockNav.location().path).toBe('/settings');
    await screen.unmount();
    app.dispose();
  });

  it('answers the page handshake with its init message', async () => {
    const app = await createTestApp();
    await renderWithApp(<HelpScreen />, { app, lang: 'hi' });
    await post(message('ready'));
    expect(mockInject).toHaveBeenCalledTimes(1);
    const script = String(mockInject.mock.calls[0]?.[0]);
    expect(script).toContain('__ppReceive');
    expect(script).toMatch(/init/);
    expect(script).toMatch(/language\W+hi/);
    await screen.unmount();
    app.dispose();
  });

  it('ignores messages from any other origin', async () => {
    const app = await createTestApp();
    await renderWithApp(<HelpScreen />, { app });
    await post(message('navigate', { route: 'settings' }), 'https://evil.example/page');
    await post(
      message('navigate', { route: 'settings' }),
      'https://help.paisape.app.evil.example/',
    );
    await post(
      message('navigate', { route: 'settings' }),
      'https://help.paisape.app@evil.example/',
    );
    expect(opened()).toEqual([]);
    await screen.unmount();
    app.dispose();
  });

  it('never lets a help page open a payment screen', async () => {
    const app = await createTestApp();
    await renderWithApp(<HelpScreen />, { app });
    for (const route of ['send-confirm', 'send', 'qr-scan', 'bills', 'request']) {
      await post(message('navigate', { route }));
    }
    expect(opened()).toEqual([]);
    await screen.unmount();
    app.dispose();
  });

  it('drops malformed messages without side effects', async () => {
    const app = await createTestApp();
    await renderWithApp(<HelpScreen />, { app });
    await post('not json');
    await post({ v: 1, id: 'x', type: 'eval', payload: {} });
    await post(message('navigate', { route: 123 }));
    expect(opened()).toEqual([]);
    expect(mockInject).not.toHaveBeenCalled();
    await screen.unmount();
    app.dispose();
  });
});
