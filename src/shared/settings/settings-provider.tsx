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
  type ThemeChoice,
} from '../../types';
import { clampGoal } from '../../domain/sessions/session-stats';
import { clampDuration } from '../../domain/timer/durations';
import { preferredLocale } from '../i18n/preferred-locale';
import { usePersistentState } from '../hooks/use-persistent-state';
import { normaliseHex } from '../theme/contrast';
import { useSystemTheme } from '../theme/use-system-theme';

const THEMES: readonly ThemeChoice[] = ['system', 'light', 'dark'];
const ACCENT_KEYS: readonly AccentKey[] = ['red', 'green', 'blue', 'custom'];
const LOCALES: readonly Locale[] = ['fr', 'en'];

const SettingsContext = createContext<SettingsContextValue | null>(null);

function oneOf<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function number(value: unknown, clamp: (input: number) => number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? clamp(value) : fallback;
}

export function normaliseSettings(raw: unknown, defaults: Settings): Settings | null {
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
    focusMinutes: number(
      source.focusMinutes,
      (input) => clampDuration('focus', input),
      defaults.focusMinutes,
    ),
    breakMinutes: number(
      source.breakMinutes,
      (input) => clampDuration('break', input),
      defaults.breakMinutes,
    ),
    dailyGoal: number(source.dailyGoal, clampGoal, defaults.dailyGoal),
  };
}

export function SettingsProvider({ children }: { children: ReactNode }): JSX.Element {
  // Read once: the language the browser asks for is a starting point, not a preference
  // that keeps overruling the one that was chosen.
  const [defaults] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, lang: preferredLocale() }));
  const normalise = useCallback((raw: unknown) => normaliseSettings(raw, defaults), [defaults]);
  const [settings, setSettings] = usePersistentState(SETTINGS_STORAGE_KEY, defaults, normalise);
  const systemTheme = useSystemTheme();

  const setTheme = useCallback(
    (theme: ThemeChoice) => setSettings((prev) => ({ ...prev, theme })),
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
  const setFocusMinutes = useCallback(
    (minutes: number) =>
      setSettings((prev) => ({ ...prev, focusMinutes: clampDuration('focus', minutes) })),
    [setSettings],
  );
  const setBreakMinutes = useCallback(
    (minutes: number) =>
      setSettings((prev) => ({ ...prev, breakMinutes: clampDuration('break', minutes) })),
    [setSettings],
  );
  const setDailyGoal = useCallback(
    (sessions: number) => setSettings((prev) => ({ ...prev, dailyGoal: clampGoal(sessions) })),
    [setSettings],
  );

  const theme: Theme = settings.theme === 'system' ? systemTheme : settings.theme;
  const accentHex =
    settings.accentKey === 'custom'
      ? settings.customColor
      : ACCENT_PALETTE[settings.accentKey][theme];

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      theme,
      accentHex,
      setTheme,
      setAccentKey,
      setCustomColor,
      setLang,
      setChime,
      setFocusMinutes,
      setBreakMinutes,
      setDailyGoal,
    }),
    [
      settings,
      theme,
      accentHex,
      setTheme,
      setAccentKey,
      setCustomColor,
      setLang,
      setChime,
      setFocusMinutes,
      setBreakMinutes,
      setDailyGoal,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside a SettingsProvider');
  return value;
}
