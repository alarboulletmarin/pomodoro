import type {
  DayDetail,
  DayStat,
  HeatLevel,
  MonthCell,
  MonthStats,
  SessionEntry,
  WeekStats,
} from '../../types';

export const DEFAULT_DAILY_GOAL = 4;
export const GOAL_BOUNDS = { min: 1, max: 12 } as const;
/** A day that overshoots the goal still fits on one row of dots. */
export const MAX_DOTS = GOAL_BOUNDS.max;

const WEEK_DAYS = 7;
const MONTH_CELLS = 35;
export const ROLLING_WINDOW_DAYS = 30;

// Calendar arithmetic only: adding 86_400_000 ms would lose or duplicate a day
// on a daylight-saving transition.
function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function startOfDay(timestamp: number): Date {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The key the charts address a day by, for a given instant. */
export function todayKey(now: number): string {
  return dayKey(startOfDay(now));
}

function startOfWeek(today: Date): Date {
  const mondayOffset = (today.getDay() + 6) % WEEK_DAYS;
  return addDays(today, -mondayOffset);
}

function countFocusByDay(entries: readonly SessionEntry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (entry.mode !== 'focus') continue;
    const key = dayKey(new Date(entry.startedAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function heatLevel(count: number): HeatLevel {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count === 3) return 2;
  return 3;
}

export function clampGoal(sessions: number): number {
  if (!Number.isFinite(sessions)) return DEFAULT_DAILY_GOAL;
  return Math.min(GOAL_BOUNDS.max, Math.max(GOAL_BOUNDS.min, Math.round(sessions)));
}

/** As many slots as the goal asks for — more if the day went past it. */
export function dotCount(goal: number, count: number): number {
  return Math.min(MAX_DOTS, Math.max(clampGoal(goal), Math.min(count, MAX_DOTS)));
}

export function todayCount(entries: readonly SessionEntry[], now: number): number {
  return countFocusByDay(entries).get(todayKey(now)) ?? 0;
}

/** Everything one day amounts to: its focus sessions and the minutes they took. */
export function dayDetail(entries: readonly SessionEntry[], date: string): DayDetail {
  let count = 0;
  let minutes = 0;
  for (const entry of entries) {
    if (entry.mode !== 'focus') continue;
    if (dayKey(new Date(entry.startedAt)) !== date) continue;
    count += 1;
    minutes += entry.minutes;
  }
  return { date, count, minutes };
}

export function weekStats(entries: readonly SessionEntry[], now: number): WeekStats {
  const counts = countFocusByDay(entries);
  const today = startOfDay(now);
  const key = dayKey(today);
  const monday = startOfWeek(today);

  const days: DayStat[] = [];
  let total = 0;
  let max = 0;

  for (let index = 0; index < WEEK_DAYS; index += 1) {
    const date = dayKey(addDays(monday, index));
    const count = counts.get(date) ?? 0;
    days.push({ date, count, isToday: date === key });
    total += count;
    if (count > max) max = count;
  }

  return { days, max, total };
}

export function monthStats(entries: readonly SessionEntry[], now: number): MonthStats {
  const counts = countFocusByDay(entries);
  const today = startOfDay(now);
  const key = dayKey(today);
  const gridStart = addDays(startOfWeek(today), -(MONTH_CELLS - WEEK_DAYS));

  const cells: MonthCell[] = [];
  let past = true;
  for (let index = 0; index < MONTH_CELLS; index += 1) {
    const date = dayKey(addDays(gridStart, index));
    const count = counts.get(date) ?? 0;
    // The grid runs to the end of the current week, so its tail is still ahead.
    cells.push({ date, count, level: heatLevel(count), isFuture: !past });
    if (date === key) past = false;
  }

  const windowStart = addDays(today, -(ROLLING_WINDOW_DAYS - 1));
  let activeDays = 0;
  let total = 0;
  for (let index = 0; index < ROLLING_WINDOW_DAYS; index += 1) {
    const count = counts.get(dayKey(addDays(windowStart, index))) ?? 0;
    if (count > 0) activeDays += 1;
    total += count;
  }

  return { cells, activeDays, total };
}
