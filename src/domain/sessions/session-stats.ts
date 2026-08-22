import type {
  DayStat,
  HeatLevel,
  MonthCell,
  MonthStats,
  SessionEntry,
  WeekStats,
} from '../../types';

export const DAILY_GOAL = 4;
export const SESSION_DOTS = 6;

const WEEK_DAYS = 7;
const MONTH_CELLS = 35;
const ROLLING_WINDOW_DAYS = 30;

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

export function todayCount(entries: readonly SessionEntry[], now: number): number {
  return countFocusByDay(entries).get(dayKey(startOfDay(now))) ?? 0;
}

export function weekStats(entries: readonly SessionEntry[], now: number): WeekStats {
  const counts = countFocusByDay(entries);
  const today = startOfDay(now);
  const todayKey = dayKey(today);
  const monday = startOfWeek(today);

  const days: DayStat[] = [];
  let total = 0;
  let max = 0;

  for (let index = 0; index < WEEK_DAYS; index += 1) {
    const date = dayKey(addDays(monday, index));
    const count = counts.get(date) ?? 0;
    days.push({ date, count, isToday: date === todayKey });
    total += count;
    if (count > max) max = count;
  }

  return { days, max, total };
}

export function monthStats(entries: readonly SessionEntry[], now: number): MonthStats {
  const counts = countFocusByDay(entries);
  const today = startOfDay(now);
  const gridStart = addDays(startOfWeek(today), -(MONTH_CELLS - WEEK_DAYS));

  const cells: MonthCell[] = [];
  for (let index = 0; index < MONTH_CELLS; index += 1) {
    const date = dayKey(addDays(gridStart, index));
    const count = counts.get(date) ?? 0;
    cells.push({ date, count, level: heatLevel(count) });
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
