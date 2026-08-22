import { TIMER_STORAGE_KEY, type Mode, type Phase, type TimerState } from '../../types';
import { clampMinutes, MS_PER_MINUTE } from './durations';
import { initialTimerState } from './timer-machine';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPhase(value: unknown): value is Phase {
  return value === 'idle' || value === 'running' || value === 'paused' || value === 'finished';
}

function isMode(value: unknown): value is Mode {
  return value === 'focus' || value === 'break';
}

function toStoredMinutes(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return clampMinutes(value);
}

function toStoredRemaining(value: unknown, minutes: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.min(minutes * MS_PER_MINUTE, Math.max(0, value));
}

export function restoreTimerState(raw: unknown, now: number, focusMinutes?: number): TimerState {
  const blank = (): TimerState => initialTimerState(focusMinutes);
  if (!isRecord(raw)) return blank();

  const { phase, mode, endsAt } = raw;
  if (!isPhase(phase) || !isMode(mode)) return blank();

  const minutes = toStoredMinutes(raw.minutes);
  if (minutes === null) return blank();

  const remainingMs = toStoredRemaining(raw.remainingMs, minutes);
  if (remainingMs === null) return blank();

  const armed: TimerState = {
    phase: 'idle',
    mode,
    minutes,
    endsAt: null,
    remainingMs: minutes * MS_PER_MINUTE,
  };

  if (phase === 'idle') return armed;
  if (phase === 'finished') return { ...armed, phase: 'finished', remainingMs: 0 };
  if (phase === 'paused') return { ...armed, phase: 'paused', remainingMs };

  if (typeof endsAt !== 'number' || !Number.isFinite(endsAt)) return armed;
  // A reload only tells us the deadline; the elapsed wall clock is replayed here.
  const left = endsAt - now;
  if (left <= 0) return { ...armed, phase: 'finished', remainingMs: 0 };
  return {
    ...armed,
    phase: 'running',
    endsAt,
    remainingMs: Math.min(minutes * MS_PER_MINUTE, left),
  };
}

export interface ElapsedSession {
  endsAt: number;
  minutes: number;
  mode: Mode;
}

/**
 * The session a stored `running` state finished with nothing watching. `restoreTimerState`
 * collapses it straight to `finished`, so no running-to-finished transition survives the
 * reload and the caller would otherwise never learn the session ran to term.
 */
export function elapsedWhileAway(raw: unknown, now: number): ElapsedSession | null {
  if (!isRecord(raw) || raw.phase !== 'running' || !isMode(raw.mode)) return null;

  const { endsAt } = raw;
  if (typeof endsAt !== 'number' || !Number.isFinite(endsAt) || endsAt > now) return null;

  const minutes = toStoredMinutes(raw.minutes);
  if (minutes === null) return null;

  return { endsAt, minutes, mode: raw.mode };
}

export function loadElapsedWhileAway(now: number): ElapsedSession | null {
  try {
    const raw = globalThis.localStorage.getItem(TIMER_STORAGE_KEY);
    if (raw === null) return null;
    return elapsedWhileAway(JSON.parse(raw), now);
  } catch {
    return null;
  }
}

export function loadTimerState(now: number, focusMinutes?: number): TimerState {
  try {
    const raw = globalThis.localStorage.getItem(TIMER_STORAGE_KEY);
    if (raw === null) return initialTimerState(focusMinutes);
    return restoreTimerState(JSON.parse(raw), now, focusMinutes);
  } catch {
    return initialTimerState(focusMinutes);
  }
}

export function saveTimerState(state: TimerState): void {
  try {
    globalThis.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or a full quota: the timer stays usable without persistence.
  }
}
