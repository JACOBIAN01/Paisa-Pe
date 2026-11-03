import { useCallback, useMemo, useRef, useState } from 'react';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { BRIDGE_VERSION, type NativeToWeb } from '@pp/contracts-ipc';
import { t } from '@pp/core-i18n';
import { useTheme, useToast } from '@pp/design-system';
import { createBridgeHandler, HELP_ORIGINS, type BridgeHandler } from '@pp/platform-webview-bridge';
import { articleUrl, HELP_URL, type SupportTopic } from '../state/help-content';
import { useUiLanguage } from './useUiLanguage';

export interface HelpBridge {
  uri: string;
  height: number | undefined;
  handler: BridgeHandler;
  contactTopic: SupportTopic | null;
  contactOpen: boolean;
  closeContact(): void;
  sendContact(topic: SupportTopic): void;
  openContact(): void;
  setInjector(inject: ((script: string) => void) | null): void;
}

export function useHelpBridge(): HelpBridge {
  const router = useRouter();
  const toast = useToast();
  const { mode } = useTheme();
  const language = useUiLanguage();
  const [uri, setUri] = useState(HELP_URL);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [contactTopic, setContactTopic] = useState<SupportTopic | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const injector = useRef<((script: string) => void) | null>(null);
  const messageCounter = useRef(0);

  const getInitMessage = useCallback((): NativeToWeb => {
    messageCounter.current += 1;
    return {
      v: BRIDGE_VERSION,
      id: `native-${messageCounter.current}`,
      type: 'init',
      payload: { theme: mode, language, appVersion: Constants.expoConfig?.version ?? '1.0.0' },
    };
  }, [mode, language]);

  const handler = useMemo(
    () =>
      createBridgeHandler({
        allowedOrigins: HELP_ORIGINS,
        navigate: (route) => router.push(`/${route}`),
        openArticle: (articleId) => {
          const next = articleUrl(articleId);
          if (next) setUri(next);
        },
        onResize: setHeight,
        onContactSupport: (topic) => {
          setContactTopic(topic);
          setContactOpen(true);
        },
        onClose: () => router.back(),
        getInitMessage,
        injectScript: (script) => injector.current?.(script),
      }),
    [router, getInitMessage],
  );

  const sendContact = useCallback(
    (topic: SupportTopic) => {
      setContactTopic(topic);
      setContactOpen(false);
      toast.show(t('help.contact.sent'), 'success');
    },
    [toast],
  );

  return {
    uri,
    height,
    handler,
    contactTopic,
    contactOpen,
    closeContact: () => setContactOpen(false),
    sendContact,
    openContact: () => setContactOpen(true),
    setInjector: (inject) => {
      injector.current = inject;
    },
  };
}
