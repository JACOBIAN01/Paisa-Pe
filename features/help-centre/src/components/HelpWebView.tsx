import { useEffect, useRef } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

export interface HelpWebViewProps {
  uri: string;
  height?: number;
  onMessage(event: WebViewMessageEvent): void;
  shouldStartLoad(url: string): boolean;
  onFailed(): void;
  /** Receives a function that runs a script in the page; called again with null on unmount. */
  onInjector(inject: ((script: string) => void) | null): void;
}

/** Thin wrapper so screens (and tests) can swap the native WebView out. */
export function HelpWebView({
  uri,
  height,
  onMessage,
  shouldStartLoad,
  onFailed,
  onInjector,
}: HelpWebViewProps) {
  const ref = useRef<WebView>(null);

  useEffect(() => {
    onInjector((script) => ref.current?.injectJavaScript(script));
    return () => onInjector(null);
  }, [onInjector]);

  return (
    <WebView
      ref={ref}
      testID="help-webview"
      accessibilityLabel="Help centre"
      source={{ uri }}
      style={height ? { height } : { flex: 1 }}
      originWhitelist={['https://help.paisape.app']}
      javaScriptEnabled
      domStorageEnabled={false}
      thirdPartyCookiesEnabled={false}
      setSupportMultipleWindows={false}
      onMessage={onMessage}
      onShouldStartLoadWithRequest={(request) => shouldStartLoad(request.url)}
      onError={onFailed}
      onHttpError={onFailed}
    />
  );
}
