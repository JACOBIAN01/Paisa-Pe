import type { ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react-native';
import { ContainerProvider } from '@pp/core-di';
import { setLanguage } from '@pp/core-i18n';
import { QueryClientProvider } from '@pp/core-query';
import { ThemeProvider, ToastProvider } from '@pp/design-system';
import type { Language } from '@pp/contracts-domain';
import { createTestApp, type TestApp } from '../scenarios/test-app';

export interface RenderWithAppOptions {
  /** Reuse an app you already created; otherwise a signed-in one is created. */
  app?: TestApp;
  lang?: Language;
  theme?: 'light' | 'dark';
}

export interface RenderWithAppResult extends RenderResult {
  app: TestApp;
}

/**
 * Renders `ui` inside the same providers the app uses: DI container (active user),
 * query client, theme, toasts and i18n. RNTL v14 is async: await this and every event.
 */
export async function renderWithApp(
  ui: ReactElement,
  options: RenderWithAppOptions = {},
): Promise<RenderWithAppResult> {
  const app = options.app ?? (await createTestApp());
  setLanguage(options.lang ?? 'en');
  const wrap = (node: ReactElement): ReactElement => (
    <ContainerProvider container={app.container}>
      <QueryClientProvider client={app.queryClient}>
        <ThemeProvider mode={options.theme ?? 'light'}>
          <ToastProvider>{node}</ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ContainerProvider>
  );
  const result = await render(wrap(ui));
  const rerender = result.rerender;
  return {
    ...result,
    app,
    rerender: (next: ReactElement) => rerender(wrap(next)),
  };
}
