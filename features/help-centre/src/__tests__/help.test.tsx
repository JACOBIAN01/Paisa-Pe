import { act, fireEvent, screen } from '@testing-library/react-native';
import { appFlags, resetFlags } from '@pp/core-flags';
import { createTestApp, renderWithApp } from '@pp/harness';
import { HelpScreen, articleUrl } from '../index';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockInject = jest.fn();
const mockWebView: { props: Record<string, (...args: never[]) => unknown> & { source?: unknown } } =
  {
    props: {},
  };

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
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

const HELP = 'https://help.paisape.app/article/1';

const send = async (message: object, url = HELP) => {
  await act(async () => {
    mockWebView.props.onMessage?.({ nativeEvent: { data: JSON.stringify(message), url } } as never);
  });
};

const msg = (type: string, payload: object = {}) => ({ v: 1, id: 'm1', type, payload });

beforeEach(() => {
  mockPush.mockClear();
  mockBack.mockClear();
  mockInject.mockClear();
  resetFlags();
});

describe('HelpScreen with the WebView', () => {
  it('loads the help centre inside the WebView', async () => {
    const { app } = await renderWithApp(<HelpScreen />);
    expect(screen.getByTestId('help-webview')).toBeTruthy();
    expect(mockWebView.props.source).toEqual({ uri: 'https://help.paisape.app/app' });
    app.dispose();
  });

  it('opens safe screens requested by a help page', async () => {
    const { app } = await renderWithApp(<HelpScreen />);
    await send(msg('navigate', { route: 'settings' }));
    expect(mockPush).toHaveBeenCalledWith('/settings');
    app.dispose();
  });

  it('never opens payment flows', async () => {
    const { app } = await renderWithApp(<HelpScreen />);
    await send(msg('navigate', { route: 'send-confirm' }));
    await send(msg('navigate', { route: 'send' }));
    expect(mockPush).not.toHaveBeenCalled();
    app.dispose();
  });

  it('ignores messages from other origins', async () => {
    const { app } = await renderWithApp(<HelpScreen />);
    await send(msg('navigate', { route: 'home' }), 'https://evil.example/page');
    await send(msg('navigate', { route: 'home' }), 'https://help.paisape.app.evil.example/');
    expect(mockPush).not.toHaveBeenCalled();
    app.dispose();
  });

  it('only lets help origins load in the WebView', async () => {
    const { app } = await renderWithApp(<HelpScreen />);
    const gate = mockWebView.props.onShouldStartLoadWithRequest as unknown as (r: {
      url: string;
    }) => boolean;
    expect(gate({ url: 'https://help.paisape.app/app' })).toBe(true);
    expect(gate({ url: 'https://evil.example/' })).toBe(false);
    app.dispose();
  });

  it('answers ready with the init message', async () => {
    const { app } = await renderWithApp(<HelpScreen />);
    await send(msg('ready'));
    expect(mockInject).toHaveBeenCalledTimes(1);
    const script = mockInject.mock.calls[0]?.[0] as string;
    expect(script).toContain('__ppReceive');
    expect(script).toContain('init');
    app.dispose();
  });

  it('opens the contact sheet when the page asks for support', async () => {
    const { app } = await renderWithApp(<HelpScreen />);
    await send(msg('contact-support', { topic: 'cards' }));
    await fireEvent.press(await screen.findByTestId('support-topic-cards'));
    expect(await screen.findByText(/support team will get back/)).toBeTruthy();
    app.dispose();
  });

  it('closes the screen on request', async () => {
    const { app } = await renderWithApp(<HelpScreen />);
    await send(msg('close'));
    expect(mockBack).toHaveBeenCalled();
    app.dispose();
  });
});

describe('HelpScreen fallback', () => {
  it('shows the offline FAQ when the page fails to load', async () => {
    const { app } = await renderWithApp(<HelpScreen />);
    await act(async () => {
      mockWebView.props.onError?.();
    });
    expect(await screen.findByTestId('help-faq')).toBeTruthy();
    expect(screen.getByText('Help articles are unavailable')).toBeTruthy();
    app.dispose();
  });

  it('shows the FAQ without a WebView when the flag is off', async () => {
    const app = await createTestApp();
    appFlags.set('helpCentreWebview', false);
    await renderWithApp(<HelpScreen />, { app });
    expect(screen.queryByTestId('help-webview')).toBeNull();
    expect(screen.getByTestId('help-faq')).toBeTruthy();
    expect(screen.queryByText('Help articles are unavailable')).toBeNull();
    app.dispose();
  });
});

describe('articleUrl', () => {
  it('accepts slugs and rejects anything else', () => {
    expect(articleUrl('reset-pin')).toBe('https://help.paisape.app/articles/reset-pin');
    expect(articleUrl('../../evil')).toBeNull();
    expect(articleUrl('https://evil.example')).toBeNull();
  });
});
