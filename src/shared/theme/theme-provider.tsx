import { useLayoutEffect, type ReactNode } from 'react';
import { ON_ACCENT, type Theme } from '../../types';
import { useMediaLayout } from '../hooks/use-media-layout';
import { useSettings } from '../settings/settings-provider';
import { bestOnColor } from './contrast';

const THEME_COLOR_ID = 'theme-color-override';
const FALLBACK_BACKGROUND: Record<Theme, string> = { light: '#FBF6EE', dark: '#151311' };

function syncThemeColor(theme: Theme): void {
  const root = document.documentElement;
  const background =
    getComputedStyle(root).getPropertyValue('--bg').trim() || FALLBACK_BACKGROUND[theme];

  let meta = document.head.querySelector<HTMLMetaElement>(`meta#${THEME_COLOR_ID}`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.id = THEME_COLOR_ID;
    meta.name = 'theme-color';
    // Prepended so it outranks the prefers-color-scheme pair declared in index.html.
    document.head.prepend(meta);
  }
  meta.content = background;
}

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const { settings, accentHex } = useSettings();
  const layout = useMediaLayout();
  const { theme, accentKey } = settings;

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.setProperty('--accent', accentHex);
    root.style.setProperty(
      '--on-accent',
      accentKey === 'custom' ? bestOnColor(accentHex) : ON_ACCENT[theme],
    );
    syncThemeColor(theme);
  }, [theme, accentKey, accentHex]);

  useLayoutEffect(() => {
    document.documentElement.dataset.layout = layout;
  }, [layout]);

  return <>{children}</>;
}
