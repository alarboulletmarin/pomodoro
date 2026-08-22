import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SessionEntry } from '../../types';
import { DAILY_GOAL, monthStats, SESSION_DOTS, todayCount, weekStats } from './session-stats';

function key(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function ts(year: number, month: number, day: number, hour = 12): number {
  return new Date(year, month - 1, day, hour).getTime();
}

function weekdayOf(dayKey: string): number {
  const [year = 0, month = 1, day = 1] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}

function focusOn(year: number, month: number, day: number, count: number): SessionEntry[] {
  return Array.from({ length: count }, (_unused, index) => ({
    startedAt: ts(year, month, day, 8 + index),
    minutes: 25,
    mode: 'focus' as const,
  }));
}

// Sunday 2026-02-08. Its week runs Mon 02-02 → Sun 02-08, its 35-cell grid
// starts Mon 2026-01-05, and its 30-day window starts 2026-01-10.
const SUNDAY = ts(2026, 2, 8, 10);

const FIXTURE: SessionEntry[] = [
  ...focusOn(2026, 1, 7, 2),
  ...focusOn(2026, 2, 2, 1),
  ...focusOn(2026, 2, 3, 2),
  ...focusOn(2026, 2, 4, 3),
  ...focusOn(2026, 2, 5, 4),
  ...focusOn(2026, 2, 6, 5),
  { startedAt: ts(2026, 2, 8, 9), minutes: 5, mode: 'break' },
];

describe('constants', () => {
  it('exposes the day counter shape', () => {
    expect(DAILY_GOAL).toBe(4);
    expect(SESSION_DOTS).toBe(6);
  });
});

describe('todayCount', () => {
  it('counts the focus sessions of the local day', () => {
    expect(todayCount(focusOn(2026, 2, 8, 3), SUNDAY)).toBe(3);
  });

  it('ignores breaks and other days', () => {
    expect(todayCount(FIXTURE, SUNDAY)).toBe(0);
    expect(todayCount(FIXTURE, ts(2026, 2, 6, 23))).toBe(5);
  });

  it('returns zero for an empty log', () => {
    expect(todayCount([], SUNDAY)).toBe(0);
  });
});

describe('weekStats', () => {
  it('runs Monday to Sunday for a Sunday', () => {
    const { days, max, total } = weekStats(FIXTURE, SUNDAY);

    expect(days).toHaveLength(7);
    expect(days.map((day) => day.date)).toEqual([
      key(2026, 2, 2),
      key(2026, 2, 3),
      key(2026, 2, 4),
      key(2026, 2, 5),
      key(2026, 2, 6),
      key(2026, 2, 7),
      key(2026, 2, 8),
    ]);
    expect(days.map((day) => day.count)).toEqual([1, 2, 3, 4, 5, 0, 0]);
    expect(days.map((day) => day.isToday)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
    expect(max).toBe(5);
    expect(total).toBe(15);
  });

  it('starts on the same day when now is a Monday', () => {
    const monday = ts(2026, 2, 9, 10);
    const { days, total } = weekStats(FIXTURE, monday);

    expect(days.at(0)?.date).toBe(key(2026, 2, 9));
    expect(days.at(0)?.isToday).toBe(true);
    expect(days.at(-1)?.date).toBe(key(2026, 2, 15));
    // The previous Sunday belongs to the previous week, so the fixture is gone.
    expect(total).toBe(0);
  });

  it('crosses a month boundary', () => {
    const { days } = weekStats([], ts(2026, 1, 1, 10));
    expect(days.at(0)?.date).toBe(key(2025, 12, 29));
    expect(days.at(-1)?.date).toBe(key(2026, 1, 4));
    expect(weekdayOf(days.at(0)?.date ?? '')).toBe(1);
  });

  it('reports a flat week', () => {
    const { days, max, total } = weekStats([], SUNDAY);
    expect(days.every((day) => day.count === 0)).toBe(true);
    expect(max).toBe(0);
    expect(total).toBe(0);
  });
});

describe('monthStats', () => {
  it('builds a Monday-aligned 35-cell grid ending on the current Sunday', () => {
    const { cells } = monthStats(FIXTURE, SUNDAY);

    expect(cells).toHaveLength(35);
    expect(cells.at(0)?.date).toBe(key(2026, 1, 5));
    expect(weekdayOf(cells.at(0)?.date ?? '')).toBe(1);
    expect(cells.at(-1)?.date).toBe(key(2026, 2, 8));
    expect(weekdayOf(cells.at(-1)?.date ?? '')).toBe(0);
    expect(new Set(cells.map((cell) => cell.date)).size).toBe(35);
  });

  it('puts today in the last row', () => {
    const midWeek = ts(2026, 2, 4, 10);
    const { cells } = monthStats(FIXTURE, midWeek);
    expect(cells.findIndex((cell) => cell.date === key(2026, 2, 4))).toBeGreaterThanOrEqual(28);
    // Days after today still get a real date and no count.
    expect(cells.at(-1)?.date).toBe(key(2026, 2, 8));
    expect(cells.at(-1)?.count).toBe(0);
  });

  it('maps counts to heat levels', () => {
    const entries = [
      ...focusOn(2026, 2, 2, 1),
      ...focusOn(2026, 2, 3, 2),
      ...focusOn(2026, 2, 4, 3),
      ...focusOn(2026, 2, 5, 4),
      ...focusOn(2026, 2, 6, 5),
    ];
    const byDate = new Map(monthStats(entries, SUNDAY).cells.map((cell) => [cell.date, cell]));

    expect(byDate.get(key(2026, 2, 7))?.level).toBe(0);
    expect(byDate.get(key(2026, 2, 2))?.level).toBe(1);
    expect(byDate.get(key(2026, 2, 3))?.level).toBe(1);
    expect(byDate.get(key(2026, 2, 4))?.level).toBe(2);
    expect(byDate.get(key(2026, 2, 5))?.level).toBe(3);
    expect(byDate.get(key(2026, 2, 6))?.level).toBe(3);
  });

  it('totals the trailing 30 days rather than the grid', () => {
    const { cells, activeDays, total } = monthStats(FIXTURE, SUNDAY);

    // 2026-01-07 sits in the grid but before the 30-day window opens on 2026-01-10.
    expect(cells.find((cell) => cell.date === key(2026, 1, 7))?.count).toBe(2);
    expect(activeDays).toBe(5);
    expect(total).toBe(15);
  });

  it('counts the window edges correctly', () => {
    const inside = monthStats(focusOn(2026, 1, 10, 1), SUNDAY);
    expect([inside.activeDays, inside.total]).toEqual([1, 1]);

    const outside = monthStats(focusOn(2026, 1, 9, 1), SUNDAY);
    expect([outside.activeDays, outside.total]).toEqual([0, 0]);
  });
});

describe('daylight saving transitions', () => {
  const originalTimeZone = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = 'Europe/Paris';
  });

  afterAll(() => {
    process.env.TZ = originalTimeZone;
  });

  it('really is running in a zone that shifts', () => {
    expect(new Date(2026, 2, 28, 12).getTimezoneOffset()).not.toBe(
      new Date(2026, 2, 30, 12).getTimezoneOffset(),
    );
    expect(new Date(2026, 9, 24, 12).getTimezoneOffset()).not.toBe(
      new Date(2026, 9, 26, 12).getTimezoneOffset(),
    );
  });

  it('keeps 7 days across the spring-forward week', () => {
    const springSunday = ts(2026, 3, 29, 10);
    const { days, total } = weekStats(focusOn(2026, 3, 29, 2), springSunday);

    expect(days).toHaveLength(7);
    expect(days.map((day) => day.date)).toEqual([
      key(2026, 3, 23),
      key(2026, 3, 24),
      key(2026, 3, 25),
      key(2026, 3, 26),
      key(2026, 3, 27),
      key(2026, 3, 28),
      key(2026, 3, 29),
    ]);
    expect(days.at(-1)?.isToday).toBe(true);
    expect(total).toBe(2);
    expect(todayCount(focusOn(2026, 3, 29, 2), springSunday)).toBe(2);
  });

  it('keeps 7 days across the fall-back week', () => {
    const autumnSunday = ts(2026, 10, 25, 10);
    const { days } = weekStats([], autumnSunday);

    expect(days).toHaveLength(7);
    expect(days.at(0)?.date).toBe(key(2026, 10, 19));
    expect(days.at(-1)?.date).toBe(key(2026, 10, 25));
  });

  // A grid walked forward with 86_400_000 ms steps repeats the fall-back day and
  // swallows the one after it, so the transition has to sit mid-grid here.
  it('keeps 35 unique cells when the grid spans a fall-back day', () => {
    const { cells } = monthStats([], ts(2026, 11, 1, 10));

    expect(cells).toHaveLength(35);
    expect(new Set(cells.map((cell) => cell.date)).size).toBe(35);
    expect(cells.at(0)?.date).toBe(key(2026, 9, 28));
    expect(cells.at(-1)?.date).toBe(key(2026, 11, 1));
    expect(cells.filter((cell) => cell.date === key(2026, 10, 25))).toHaveLength(1);
    expect(cells.filter((cell) => cell.date === key(2026, 10, 26))).toHaveLength(1);
  });

  it('keeps the grid aligned when it spans a spring-forward day', () => {
    const { cells } = monthStats([], ts(2026, 4, 5, 10));

    expect(cells).toHaveLength(35);
    expect(cells.at(0)?.date).toBe(key(2026, 3, 2));
    expect(weekdayOf(cells.at(0)?.date ?? '')).toBe(1);
    expect(cells.at(-1)?.date).toBe(key(2026, 4, 5));
    expect(cells.filter((cell) => cell.date === key(2026, 3, 29))).toHaveLength(1);
  });

  it('counts a session on a spring-forward day', () => {
    const entries = focusOn(2026, 3, 29, 2);
    const { activeDays, total, cells } = monthStats(entries, ts(2026, 4, 5, 10));

    expect(cells.find((cell) => cell.date === key(2026, 3, 29))?.count).toBe(2);
    expect(activeDays).toBe(1);
    expect(total).toBe(2);
  });

  it('counts the day after a fall-back inside the 30-day window', () => {
    const entries = [...focusOn(2026, 10, 26, 3), ...focusOn(2026, 10, 25, 1)];
    const { activeDays, total, cells } = monthStats(entries, ts(2026, 11, 1, 10));

    expect(cells.find((cell) => cell.date === key(2026, 10, 26))?.count).toBe(3);
    expect(activeDays).toBe(2);
    expect(total).toBe(4);
  });
});
