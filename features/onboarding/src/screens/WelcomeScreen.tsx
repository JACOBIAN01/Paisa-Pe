import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button, Screen, Stack, Text } from '@pp/design-system';
import { t } from '@pp/core-i18n';
import { SLIDES } from '../state/slides';
import { SlideView } from '../components/SlideView';
import { Dots } from '../components/Dots';
import { LanguageChips } from '../components/LanguageChips';
import { useLanguage } from '../hooks/useLanguage';

export function WelcomeScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [language, changeLanguage] = useLanguage();
  const last = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  return (
    <Screen testID="welcome-screen">
      <Stack gap="xl" style={{ flex: 1, justifyContent: 'center' }}>
        <Text variant="heading" style={{ textAlign: 'center' }}>
          {t('auth.welcome')}
        </Text>
        <LanguageChips value={language} onChange={changeLanguage} />
        {slide ? <SlideView slide={slide} /> : null}
        <Dots count={SLIDES.length} active={index} />
        <Stack gap="sm">
          <Button
            testID="welcome-next"
            title={last ? 'Get started' : t('common.continue')}
            onPress={() => (last ? router.push('/login') : setIndex((i) => i + 1))}
          />
          {last ? null : (
            <Button variant="ghost" title="Skip" onPress={() => router.push('/login')} />
          )}
        </Stack>
      </Stack>
    </Screen>
  );
}
