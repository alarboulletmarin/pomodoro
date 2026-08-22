import type { I18nContextValue } from '../../types';

/** `2026-08-19` at local midnight — never the UTC instant `new Date(key)` would give. */
export function localDate(key: string): Date {
  return new Date(`${key}T00:00:00`);
}

/** `50 min`, `1 h`, `1 h 15` — null below a minute, so the caller can drop the segment. */
export function durationLabel(t: I18nContextValue['t'], minutes: number): string | null {
  if (minutes <= 0) return null;
  if (minutes < 60) return t('stats.duration.minutes', { minutes });

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0
    ? t('stats.duration.hours', { hours })
    : t('stats.duration.hoursMinutes', { hours, minutes: String(rest).padStart(2, '0') });
}
