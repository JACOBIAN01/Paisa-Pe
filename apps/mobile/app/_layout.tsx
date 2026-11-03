import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { LockScreen } from '@pp/feat-auth';
import { useNotificationTaps } from '@pp/platform-notifications';
import { AppProviders, RuntimeProvider, createAppRuntime, startPlatform } from '../src/runtime';

export default function RootLayout() {
  const [runtime] = useState(() => createAppRuntime());
  const router = useRouter();

  useEffect(() => {
    const platform = startPlatform(runtime, {
      navigate: (route, params) => router.push({ pathname: `/${route}`, params }),
    });
    return () => platform.dispose();
  }, [runtime, router]);

  useNotificationTaps((route, params) => router.push({ pathname: `/${route}`, params }));

  return (
    <RuntimeProvider runtime={runtime}>
      <AppProviders runtime={runtime} lockScreen={<LockScreen />}>
        <Stack screenOptions={{ headerShown: false }} />
      </AppProviders>
    </RuntimeProvider>
  );
}
