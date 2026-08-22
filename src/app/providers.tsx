import type { ReactNode } from 'react';
import { SettingsProvider } from '../shared/settings/settings-provider';
import { ThemeProvider } from '../shared/theme/theme-provider';

export function Providers({ children }: { children: ReactNode }): JSX.Element {
  return (
    <SettingsProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </SettingsProvider>
  );
}
