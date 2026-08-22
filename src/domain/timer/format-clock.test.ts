import { describe, expect, it } from 'vitest';
import { displayedSeconds, formatClock, formatMinutesClock } from './format-clock';

describe('formatClock', () => {
  it('never goes below zero', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(-1)).toBe('00:00');
    expect(formatClock(-90_000)).toBe('00:00');
    expect(formatClock(Number.NaN)).toBe('00:00');
  });

  it('rounds up to the next whole second', () => {
    expect(formatClock(1)).toBe('00:01');
    expect(formatClock(999)).toBe('00:01');
    expect(formatClock(1000)).toBe('00:01');
    expect(formatClock(1001)).toBe('00:02');
    expect(formatClock(59_999)).toBe('01:00');
  });

  it('handles the minute boundaries', () => {
    expect(formatClock(60_000)).toBe('01:00');
    expect(formatClock(60_001)).toBe('01:01');
    expect(formatClock(599_000)).toBe('09:59');
  });

  it('reads a fresh timer at its full duration', () => {
    expect(formatClock(25 * 60_000)).toBe('25:00');
    expect(formatClock(90 * 60_000)).toBe('90:00');
  });
});

describe('formatMinutesClock', () => {
  it('pads the ghost values', () => {
    expect(formatMinutesClock(26)).toBe('26:00');
    expect(formatMinutesClock(5)).toBe('05:00');
    expect(formatMinutesClock(90)).toBe('90:00');
  });

  it('stays readable for unusable input', () => {
    expect(formatMinutesClock(0)).toBe('00:00');
    expect(formatMinutesClock(-3)).toBe('00:00');
    expect(formatMinutesClock(Number.NaN)).toBe('00:00');
  });
});

describe('displayedSeconds', () => {
  it('is the rounding the clock face and the tick gate share', () => {
    expect(displayedSeconds(25 * 60_000)).toBe(1500);
    expect(displayedSeconds(1)).toBe(1);
    expect(displayedSeconds(0)).toBe(0);
    expect(displayedSeconds(-5)).toBe(0);
    expect(displayedSeconds(Number.NaN)).toBe(0);
  });
});
