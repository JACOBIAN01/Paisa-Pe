import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { appFlags } from '@pp/core-flags';
import { t } from '@pp/core-i18n';
import { Button, Screen, Stack, Text } from '@pp/design-system';
import { useIsOnline } from '@pp/platform-connectivity';
import { ContactSheet } from '../components/ContactSheet';
import { FaqList } from '../components/FaqList';
import { HelpWebView } from '../components/HelpWebView';
import { useHelpBridge } from '../hooks/useHelpBridge';

export function HelpScreen() {
  const bridge = useHelpBridge();
  const online = useIsOnline();
  const [failed, setFailed] = useState(false);
  const onFailed = useCallback(() => setFailed(true), []);
  const webEnabled = appFlags.get('helpCentreWebview');
  const showWeb = webEnabled && online && !failed;

  return (
    <Screen testID="help-screen">
      <Stack gap="md" style={{ flex: 1 }}>
        <Text variant="title">{t('help.title')}</Text>
        {showWeb ? (
          <View style={{ flex: 1 }}>
            <HelpWebView
              uri={bridge.uri}
              height={bridge.height}
              onMessage={bridge.handler.onMessage}
              shouldStartLoad={bridge.handler.shouldStartLoad}
              onFailed={onFailed}
              onInjector={bridge.setInjector}
            />
          </View>
        ) : (
          <FaqList offline={webEnabled} />
        )}
        <Button testID="contact-support" title={t('help.contact')} onPress={bridge.openContact} />
      </Stack>
      <ContactSheet
        visible={bridge.contactOpen}
        initialTopic={bridge.contactTopic}
        onSelect={bridge.sendContact}
        onClose={bridge.closeContact}
      />
    </Screen>
  );
}
