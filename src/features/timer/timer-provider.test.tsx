import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { SettingsProvider } from '../../shared/settings/settings-provider';
import { TimerProvider, useTimer } from './timer-provider';

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
