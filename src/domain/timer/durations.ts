import type { Mode, SessionDurations, Suggestion } from '../../types';

export const FOCUS_PRESETS = [15, 25, 45] as const;
export const BREAK_PRESETS = [5, 10, 15] as const;

export const MIN_MINUTES = 1;
export const MAX_MINUTES = 90;
export const DEFAULT_FOCUS_MINUTES = 25;
export const DEFAULT_BREAK_MINUTES = 5;
export const SCRUB_PIXELS_PER_MINUTE = 9;
export const MS_PER_MINUTE = 60_000;

/** What the two settable defaults accept. The scrubber keeps the wider bounds. */
export const DURATION_BOUNDS: Record<Mode, { min: number; max: number }> = {
  focus: { min: 5, max: MAX_MINUTES },
  break: { min: 1, max: 30 },
};

export function presetsFor(mode: Mode): readonly number[] {
  return mode === 'focus' ? FOCUS_PRESETS : BREAK_PRESETS;
}

export function clampMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return MIN_MINUTES;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(minutes)));
}

export function clampDuration(mode: Mode, minutes: number): number {
  const { min, max } = DURATION_BOUNDS[mode];
  if (!Number.isFinite(minutes))
    return mode === 'focus' ? DEFAULT_FOCUS_MINUTES : DEFAULT_BREAK_MINUTES;
  return Math.min(max, Math.max(min, Math.round(minutes)));
}

export function minutesFromScrub(startMinutes: number, deltaY: number): number {
  if (!Number.isFinite(deltaY)) return clampMinutes(startMinutes);
  // Truncating keeps a full 9px travel per minute, so a jittery finger stays put.
  const delta = Math.trunc(deltaY / SCRUB_PIXELS_PER_MINUTE);
  return clampMinutes(clampMinutes(startMinutes) + delta);
}

export const DEFAULT_DURATIONS: SessionDurations = {
  focus: DEFAULT_FOCUS_MINUTES,
  break: DEFAULT_BREAK_MINUTES,
};

/** The other mode, at whatever length the settings hold for it. */
export function nextSuggestion(
  mode: Mode,
  durations: SessionDurations = DEFAULT_DURATIONS,
): Suggestion {
  const next: Mode = mode === 'focus' ? 'break' : 'focus';
  return { mode: next, minutes: clampDuration(next, durations[next]) };
}
