function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Rounding up keeps a freshly armed 25 min timer on "25:00" instead of "24:59". */
export function displayedSeconds(remainingMs: number): number {
  const safeMs = Number.isFinite(remainingMs) && remainingMs > 0 ? remainingMs : 0;
  return Math.ceil(safeMs / 1000);
}

export function formatClock(remainingMs: number): string {
  const totalSeconds = displayedSeconds(remainingMs);
  return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
}

export function formatMinutesClock(minutes: number): string {
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : 0;
  return `${pad(safeMinutes)}:00`;
}
