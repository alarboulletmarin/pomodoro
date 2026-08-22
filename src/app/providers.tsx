import type { ReactNode } from 'react';
import { TimerProvider } from '../features/timer/timer-provider';
import { I18nProvider } from '../shared/i18n/i18n';
import { SettingsProvider } from '../shared/settings/settings-provider';
import { ThemeProvider } from '../shared/theme/theme-provider';

export function Providers({ children }: { children: ReactNode }): JSX.Element {
  return (
    <SettingsProvider>
      <I18nProvider>
        <ThemeProvider>
          <TimerProvider>{children}</TimerProvider>
        </ThemeProvider>
      </I18nProvider>
    </SettingsProvider>
  );
}
