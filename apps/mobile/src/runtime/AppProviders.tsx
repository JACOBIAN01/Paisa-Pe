import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ContainerProvider } from '@pp/core-di';
import { appBus } from '@pp/core-event-bus';
import { setLanguage } from '@pp/core-i18n';
import { QueryClientProvider } from '@pp/core-query';
import { useHydrated } from '@pp/core-store';
import { Spinner, Text, ThemeProvider, ToastProvider } from '@pp/design-system';
import { lockStore, useIsLocked, usePrivacyShield } from '@pp/platform-lifecycle';
import type { AppRuntime } from './create-runtime';

export interface AppProvidersProps {
  runtime: AppRuntime;
  /** Shown instead of `children` while the app is locked. */
  lockScreen?: ReactNode;
  children: ReactNode;
}

function Splash() {
  return (
    <View style={styles.center} testID="splash">
      <Spinner label="Starting PaisaPe" />
    </View>
  );
}

function PrivacyCover() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.center, styles.cover]} testID="privacy-cover">
      <Text variant="title">PaisaPe</Text>
    </View>
  );
}

/** Keeps the UI language in step with the signed-in user's saved preference. */
function useLanguageFromPreferences(runtime: AppRuntime, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    const apply = (): void => {
      void runtime.readPreferences().then((prefs) => {
        if (!cancelled && prefs) setLanguage(prefs.language);
      });
    };
    apply();
    const off = appBus.on('profile.changed', apply);
    return () => {
      cancelled = true;
      off();
    };
  }, [runtime, enabled]);
}

/**
 * Root providers. Nothing renders until the lock state and saved sessions have
 * been read; once they have, a locked app shows `lockScreen` rather than content.
 */
export function AppProviders({ runtime, lockScreen, children }: AppProvidersProps) {
  const [started, setStarted] = useState(false);
  const container = useSyncExternalStore(runtime.subscribeContainer, runtime.getContainer);
  const lockHydrated = useHydrated(lockStore);
  const locked = useIsLocked();
  const shield = usePrivacyShield();

  useEffect(() => {
    let cancelled = false;
    runtime.start().finally(() => {
      if (!cancelled) setStarted(true);
    });
    return () => {
      cancelled = true;
    };
  }, [runtime]);

  const ready = started && lockHydrated;
  useLanguageFromPreferences(runtime, ready);

  return (
    <ContainerProvider container={container}>
      <QueryClientProvider client={runtime.queryClient}>
        <ThemeProvider>
          <ToastProvider>
            {!ready ? <Splash /> : locked ? (lockScreen ?? <Splash />) : children}
            {shield && ready ? <PrivacyCover /> : null}
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ContainerProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cover: { backgroundColor: '#FFFFFF' },
});
