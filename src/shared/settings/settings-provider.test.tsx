import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { ACCENT_PALETTE, DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '../../types';
import { normaliseSettings, SettingsProvider, useSettings } from './settings-provider';

type Listener = (event: MediaQueryListEvent) => void;

// jsdom answers every query with `false` and never changes its mind; the theme has to
// be driven from the test, listeners included.
function stubColorScheme(dark: boolean) {
  const listeners = new Set<Listener>();
  const original = window.matchMedia;
  let current = dark;

  window.matchMedia = ((query: string) => ({
    media: query,
    matches: query.includes('prefers-color-scheme: dark') ? current : false,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: (_type: string, listener: Listener) => void listeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => void listeners.delete(listener),
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;

  return {
    set(next: boolean) {
      current = next;
      for (const listener of [...listeners]) listener({ matches: next } as MediaQueryListEvent);
    },
    restore() {
      window.matchMedia = original;
    },
  };
}

function wrapper({ children }: { children: ReactNode }): JSX.Element {
  return <SettingsProvider>{children}</SettingsProvider>;
}

function mount() {
  return renderHook(() => useSettings(), { wrapper });
}

afterEach(() => {
  window.localStorage.clear();
});

describe('the system theme', () => {
  it('is what a fresh install starts on', () => {
    const media = stubColorScheme(false);
    const { result } = mount();

    expect(result.current.settings.theme).toBe('system');
    expect(result.current.theme).toBe('light');

    media.restore();
  });

  it('resolves to whatever the device asks for', () => {
    const media = stubColorScheme(true);
    const { result } = mount();

    expect(result.current.theme).toBe('dark');
    expect(result.current.accentHex).toBe(ACCENT_PALETTE.red.dark);

    media.restore();
  });

  it('follows the device changing its mind, with nothing stored and no reload', () => {
    const media = stubColorScheme(false);
    const { result } = mount();
    expect(result.current.theme).toBe('light');

    act(() => media.set(true));

    expect(result.current.theme).toBe('dark');
    expect(result.current.settings.theme).toBe('system');
    expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull();

    media.restore();
  });

  it('stops following once a theme is picked', () => {
    const media = stubColorScheme(true);
    const { result } = mount();

    act(() => result.current.setTheme('light'));
    expect(result.current.theme).toBe('light');

    act(() => media.set(false));
    act(() => media.set(true));
    expect(result.current.theme).toBe('light');

    act(() => result.current.setTheme('system'));
    expect(result.current.theme).toBe('dark');

    media.restore();
  });
});

describe('the settable lengths and goal', () => {
  it('starts on the documented defaults', () => {
    const { result } = mount();

    expect(result.current.settings.focusMinutes).toBe(25);
    expect(result.current.settings.breakMinutes).toBe(5);
    expect(result.current.settings.dailyGoal).toBe(4);
  });

  it('holds each one inside its own bounds', () => {
    const { result } = mount();

    act(() => result.current.setFocusMinutes(200));
    act(() => result.current.setBreakMinutes(0));
    act(() => result.current.setDailyGoal(99));

    expect(result.current.settings.focusMinutes).toBe(90);
    expect(result.current.settings.breakMinutes).toBe(1);
    expect(result.current.settings.dailyGoal).toBe(12);
  });

  it('persists what was set', () => {
    const { result, unmount } = mount();
    act(() => result.current.setBreakMinutes(12));
    unmount();

    expect(mount().result.current.settings.breakMinutes).toBe(12);
  });
});

describe('normaliseSettings', () => {
  it('reads a payload written before the lengths existed', () => {
    const stored = { theme: 'dark', accentKey: 'blue', customColor: '#123456', lang: 'en' };

    expect(normaliseSettings(stored, DEFAULT_SETTINGS)).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'dark',
      accentKey: 'blue',
      customColor: '#123456',
      lang: 'en',
    });
  });

  it('accepts system as a stored theme', () => {
    expect(normaliseSettings({ theme: 'system' }, DEFAULT_SETTINGS)?.theme).toBe('system');
  });

  it('clamps a tampered length rather than dropping the whole payload', () => {
    const normalised = normaliseSettings(
      { focusMinutes: 1_000, breakMinutes: -4, dailyGoal: 0 },
      DEFAULT_SETTINGS,
    );

    expect(normalised).toMatchObject({ focusMinutes: 90, breakMinutes: 1, dailyGoal: 1 });
  });

  it('falls back for values of the wrong shape', () => {
    const normalised = normaliseSettings(
      { focusMinutes: '40', breakMinutes: null, dailyGoal: Number.NaN, theme: 'sepia' },
      DEFAULT_SETTINGS,
    );

    expect(normalised).toEqual(DEFAULT_SETTINGS);
  });

  it('rejects anything that is not an object', () => {
    expect(normaliseSettings(null, DEFAULT_SETTINGS)).toBeNull();
    expect(normaliseSettings([], DEFAULT_SETTINGS)).toBeNull();
    expect(normaliseSettings('dark', DEFAULT_SETTINGS)).toBeNull();
  });
});
