import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type Settings } from '../../types';
import { SettingsProvider } from '../../shared/settings/settings-provider';
import { TimerProvider, useTimer } from './timer-provider';

function seedSettings(settings: Partial<Settings>): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, ...settings }));
}

function wrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <SettingsProvider>
      <TimerProvider>{children}</TimerProvider>
    </SettingsProvider>
  );
}

function mountTimer() {
  return renderHook(() => useTimer(), { wrapper });
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-22T09:00:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('session logging', () => {
  it('appends exactly one session and arms the suggestion when a focus run finishes', () => {
    const { result } = mountTimer();

    act(() => result.current.setMinutes(1));
    act(() => result.current.start());
    act(() => void vi.advanceTimersByTime(60_000 + 300));

    expect(result.current.state.phase).toBe('finished');
    expect(result.current.sessions).toEqual([
      { startedAt: Date.now() - 60_000, minutes: 1, mode: 'focus' },
    ]);
    expect(result.current.suggestion).toEqual({ mode: 'break', minutes: 5 });
    expect(result.current.todayCount).toBe(1);
  });

  it('records nothing when the session is ended early', () => {
    const { result } = mountTimer();

    act(() => result.current.setMinutes(1));
    act(() => result.current.start());
    act(() => void vi.advanceTimersByTime(30_000));
    act(() => result.current.end());

    expect(result.current.state.phase).toBe('idle');
    expect(result.current.sessions).toEqual([]);
    expect(result.current.suggestion).toBeNull();
  });
});

describe('suggestion', () => {
  it('arms the suggested mode and duration when accepted', () => {
    const { result } = mountTimer();

    act(() => result.current.setMinutes(1));
    act(() => result.current.start());
    act(() => void vi.advanceTimersByTime(60_000 + 300));
    act(() => result.current.acceptSuggestion());

    expect(result.current.state).toMatchObject({
      phase: 'idle',
      mode: 'break',
      minutes: 5,
      remainingMs: 300_000,
    });
    expect(result.current.suggestion).toBeNull();
  });

  it('falls back to a default focus session when dismissed', () => {
    const { result } = mountTimer();

    act(() => result.current.setMinutes(1));
    act(() => result.current.start());
    act(() => void vi.advanceTimersByTime(60_000 + 300));
    act(() => result.current.dismissSuggestion());

    expect(result.current.state).toMatchObject({ phase: 'idle', mode: 'focus', minutes: 25 });
    expect(result.current.suggestion).toBeNull();
  });
});

describe('the settable lengths', () => {
  it('arms the configured focus session on a first launch', () => {
    seedSettings({ focusMinutes: 40 });
    const { result } = mountTimer();

    expect(result.current.state).toMatchObject({ phase: 'idle', mode: 'focus', minutes: 40 });
    expect(result.current.remainingMs).toBe(40 * 60_000);
  });

  it('leaves a session already under way alone', () => {
    const first = mountTimer();
    act(() => first.result.current.setMinutes(15));
    act(() => first.result.current.start());
    first.unmount();

    seedSettings({ focusMinutes: 40 });
    const { result } = mountTimer();

    expect(result.current.state).toMatchObject({ phase: 'running', minutes: 15 });
  });

  it('suggests the break the settings hold, not a fixed five minutes', () => {
    seedSettings({ breakMinutes: 12 });
    const { result } = mountTimer();

    act(() => result.current.setMinutes(1));
    act(() => result.current.start());
    act(() => void vi.advanceTimersByTime(60_000 + 300));

    expect(result.current.suggestion).toEqual({ mode: 'break', minutes: 12 });

    act(() => result.current.acceptSuggestion());
    expect(result.current.state).toMatchObject({ mode: 'break', minutes: 12 });
  });

  it('suggests the configured focus session after a break', () => {
    seedSettings({ focusMinutes: 50 });
    const { result } = mountTimer();

    act(() => result.current.setMinutes(1));
    act(() => result.current.start());
    act(() => void vi.advanceTimersByTime(60_000 + 300));
    act(() => result.current.acceptSuggestion());
    act(() => result.current.start());
    act(() => void vi.advanceTimersByTime(5 * 60_000 + 300));

    expect(result.current.suggestion).toEqual({ mode: 'focus', minutes: 50 });
  });

  it('falls back to the configured focus session when the suggestion is dismissed', () => {
    seedSettings({ focusMinutes: 30 });
    const { result } = mountTimer();

    act(() => result.current.setMinutes(1));
    act(() => result.current.start());
    act(() => void vi.advanceTimersByTime(60_000 + 300));
    act(() => result.current.dismissSuggestion());

    expect(result.current.state).toMatchObject({ phase: 'idle', mode: 'focus', minutes: 30 });
  });
});

describe('drift', () => {
  it('lands exactly on zero after the tab was frozen for the whole session', () => {
    const { result } = mountTimer();

    act(() => result.current.start());
    // No timers advanced: only the wall clock moved, as for a sleeping device.
    vi.setSystemTime(Date.now() + 25 * 60_000);
    act(() => void document.dispatchEvent(new Event('visibilitychange')));

    expect(result.current.state.phase).toBe('finished');
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.progressRatio).toBe(1);
  });

  it('logs and settles a session that ran to term while the app was closed', () => {
    const first = mountTimer();
    act(() => first.result.current.setMinutes(1));
    act(() => first.result.current.start());
    first.unmount();

    // The deadline passes with nothing mounted: no phase transition is left to observe.
    vi.setSystemTime(Date.now() + 10 * 60_000);
    const { result } = mountTimer();

    expect(result.current.state.phase).toBe('finished');
    expect(result.current.sessions).toEqual([
      { startedAt: Date.now() - 10 * 60_000, minutes: 1, mode: 'focus' },
    ]);
    expect(result.current.suggestion).toEqual({ mode: 'break', minutes: 5 });

    act(() => result.current.acceptSuggestion());
    expect(result.current.state).toMatchObject({ phase: 'idle', mode: 'break', minutes: 5 });
  });

  it('logs nothing extra when a finished session is merely reloaded', () => {
    const first = mountTimer();
    act(() => first.result.current.setMinutes(1));
    act(() => first.result.current.start());
    act(() => void vi.advanceTimersByTime(60_000 + 300));
    expect(first.result.current.sessions).toHaveLength(1);
    first.unmount();

    const { result } = mountTimer();
    expect(result.current.state.phase).toBe('finished');
    expect(result.current.sessions).toHaveLength(1);
  });

  it('restores a running session across a remount', () => {
    const first = mountTimer();
    act(() => first.result.current.start());
    first.unmount();

    vi.setSystemTime(Date.now() + 10 * 60_000);
    const { result } = mountTimer();

    expect(result.current.state.phase).toBe('running');
    expect(result.current.remainingMs).toBe(15 * 60_000);
  });
});
