import type { Mode } from '../../types';

export const FOCUS_PRESETS = [15, 25, 45] as const;
export const BREAK_PRESETS = [5, 10, 15] as const;

export const MIN_MINUTES = 1;
export const MAX_MINUTES = 90;
export const DEFAULT_FOCUS_MINUTES = 25;
export const DEFAULT_BREAK_MINUTES = 5;
export const SCRUB_PIXELS_PER_MINUTE = 9;
export const MS_PER_MINUTE = 60_000;

export function presetsFor(mode: Mode): readonly number[] {
  return mode === 'focus' ? FOCUS_PRESETS : BREAK_PRESETS;
}

export function clampMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return MIN_MINUTES;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(minutes)));
}

export function minutesFromScrub(startMinutes: number, deltaY: number): number {
  if (!Number.isFinite(deltaY)) return clampMinutes(startMinutes);
  // Truncating keeps a full 9px travel per minute, so a jittery finger stays put.
  const delta = Math.trunc(deltaY / SCRUB_PIXELS_PER_MINUTE);
  return clampMinutes(clampMinutes(startMinutes) + delta);
}

export function nextSuggestion(mode: Mode): { mode: Mode; minutes: number } {
  return mode === 'focus'
    ? { mode: 'break', minutes: DEFAULT_BREAK_MINUTES }
    : { mode: 'focus', minutes: DEFAULT_FOCUS_MINUTES };
}
