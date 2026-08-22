import { describe, expect, it } from 'vitest';
import {
  BREAK_PRESETS,
  clampMinutes,
  DEFAULT_BREAK_MINUTES,
  DEFAULT_FOCUS_MINUTES,
  FOCUS_PRESETS,
  MAX_MINUTES,
  MIN_MINUTES,
  minutesFromScrub,
  nextSuggestion,
  presetsFor,
  SCRUB_PIXELS_PER_MINUTE,
} from './durations';

describe('presets', () => {
  it('exposes the documented values', () => {
    expect(FOCUS_PRESETS).toEqual([15, 25, 45]);
    expect(BREAK_PRESETS).toEqual([5, 10, 15]);
    expect([MIN_MINUTES, MAX_MINUTES]).toEqual([1, 90]);
    expect(SCRUB_PIXELS_PER_MINUTE).toBe(9);
  });

  it('picks the list matching the mode', () => {
    expect(presetsFor('focus')).toEqual([15, 25, 45]);
    expect(presetsFor('break')).toEqual([5, 10, 15]);
  });
});

describe('clampMinutes', () => {
  it('keeps values inside the bounds', () => {
    expect(clampMinutes(25)).toBe(25);
    expect(clampMinutes(1)).toBe(1);
    expect(clampMinutes(90)).toBe(90);
  });

  it('clamps both ends', () => {
    expect(clampMinutes(0)).toBe(1);
    expect(clampMinutes(-40)).toBe(1);
    expect(clampMinutes(91)).toBe(90);
    expect(clampMinutes(10_000)).toBe(90);
  });

  it('rounds to whole minutes', () => {
    expect(clampMinutes(25.4)).toBe(25);
    expect(clampMinutes(25.6)).toBe(26);
  });

  it('falls back to the minimum for unusable numbers', () => {
    expect(clampMinutes(Number.NaN)).toBe(1);
    expect(clampMinutes(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe('minutesFromScrub', () => {
  it('adds a minute per 9px upwards', () => {
    expect(minutesFromScrub(25, 9)).toBe(26);
    expect(minutesFromScrub(25, 18)).toBe(27);
    expect(minutesFromScrub(25, 90)).toBe(35);
  });

  it('removes a minute per 9px downwards', () => {
    expect(minutesFromScrub(25, -9)).toBe(24);
    expect(minutesFromScrub(25, -18)).toBe(23);
  });

  it('ignores sub-threshold movement', () => {
    expect(minutesFromScrub(25, 0)).toBe(25);
    expect(minutesFromScrub(25, 8)).toBe(25);
    expect(minutesFromScrub(25, -8)).toBe(25);
    expect(minutesFromScrub(25, 17)).toBe(26);
  });

  it('clamps at both bounds', () => {
    expect(minutesFromScrub(25, 100_000)).toBe(90);
    expect(minutesFromScrub(25, -100_000)).toBe(1);
    expect(minutesFromScrub(90, 9)).toBe(90);
    expect(minutesFromScrub(1, -9)).toBe(1);
  });

  it('survives an unusable delta', () => {
    expect(minutesFromScrub(25, Number.NaN)).toBe(25);
  });
});

describe('nextSuggestion', () => {
  it('offers a short break after a focus session', () => {
    expect(nextSuggestion('focus')).toEqual({ mode: 'break', minutes: DEFAULT_BREAK_MINUTES });
    expect(DEFAULT_BREAK_MINUTES).toBe(5);
  });

  it('offers a focus session after a break', () => {
    expect(nextSuggestion('break')).toEqual({ mode: 'focus', minutes: DEFAULT_FOCUS_MINUTES });
    expect(DEFAULT_FOCUS_MINUTES).toBe(25);
  });
});
