import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  ACCENT_PALETTE,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type AccentKey,
  type Locale,
  type Settings,
  type SettingsContextValue,
  type Theme,
} from '../../types';
import { usePersistentState } from '../hooks/use-persistent-state';
import { normaliseHex } from '../theme/contrast';

const THEMES: readonly Theme[] = ['light', 'dark'];
const ACCENT_KEYS: readonly AccentKey[] = ['red', 'green', 'blue', 'custom'];
const LOCALES: readonly Locale[] = ['fr', 'en'];

const SettingsContext = createContext<SettingsContextValue | null>(null);

function oneOf<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function normaliseSettings(raw: unknown, defaults: Settings): Settings | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const source = raw as Partial<Record<keyof Settings, unknown>>;
  const customColor =
    typeof source.customColor === 'string' ? normaliseHex(source.customColor) : null;
  return {
    theme: oneOf(THEMES, source.theme, defaults.theme),
    accentKey: oneOf(ACCENT_KEYS, source.accentKey, defaults.accentKey),
    customColor: customColor ?? defaults.customColor,
    lang: oneOf(LOCALES, source.lang, defaults.lang),
    chime: typeof source.chime === 'boolean' ? source.chime : defaults.chime,
  };
}

function initialSettings(): Settings {
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return { ...DEFAULT_SETTINGS, theme: prefersDark ? 'dark' : 'light' };
}

export function SettingsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [defaults] = useState(initialSettings);
  const normalise = useCallback((raw: unknown) => normaliseSettings(raw, defaults), [defaults]);
  const [settings, setSettings] = usePersistentState(SETTINGS_STORAGE_KEY, defaults, normalise);

  const setTheme = useCallback(
    (theme: Theme) => setSettings((prev) => ({ ...prev, theme })),
    [setSettings],
  );
  const setAccentKey = useCallback(
    (accentKey: AccentKey) => setSettings((prev) => ({ ...prev, accentKey })),
    [setSettings],
  );
  const setCustomColor = useCallback(
    (hex: string) => {
      const customColor = normaliseHex(hex);
      if (!customColor) return;
      setSettings((prev) => ({ ...prev, customColor }));
    },
    [setSettings],
  );
  const setLang = useCallback(
    (lang: Locale) => setSettings((prev) => ({ ...prev, lang })),
    [setSettings],
  );
  const setChime = useCallback(
    (chime: boolean) => setSettings((prev) => ({ ...prev, chime })),
    [setSettings],
  );

  const accentHex =
    settings.accentKey === 'custom'
      ? settings.customColor
      : ACCENT_PALETTE[settings.accentKey][settings.theme];

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      accentHex,
      setTheme,
      setAccentKey,
      setCustomColor,
      setLang,
      setChime,
    }),
    [settings, accentHex, setTheme, setAccentKey, setCustomColor, setLang, setChime],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside a SettingsProvider');
  return value;
}
