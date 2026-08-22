import { useMemo } from 'react';
import { useI18n } from '../../shared/i18n/i18n';
import type { MessageKey, WeekStats } from '../../types';
import { localDate } from './day-label';
import styles from './WeekChart.module.css';

const DAY_KEYS: readonly MessageKey[] = [
  'stats.day.mon',
  'stats.day.tue',
  'stats.day.wed',
  'stats.day.thu',
  'stats.day.fri',
  'stats.day.sat',
  'stats.day.sun',
];

const BAR_FLOOR_PERCENT = 6;
const EMPTY_COUNT = '–';

function barHeight(count: number, max: number): string {
  const ratio = max > 0 ? (count / max) * 100 : 0;
  return `${Math.max(BAR_FLOOR_PERCENT, Math.round(ratio))}%`;
}

export interface WeekChartProps {
  stats: WeekStats;
  selected: string | null;
  onSelect(date: string): void;
}

export function WeekChart({ stats, selected, onSelect }: WeekChartProps): JSX.Element {
  const { t, tn, formatDate } = useI18n();

  const bars = useMemo(
    () =>
      stats.days.map((day, index) => {
        const short = t(DAY_KEYS[index] ?? 'stats.day.mon');
        const name = formatDate(localDate(day.date), { weekday: 'long' });
        const amount = day.count === 0 ? t('stats.day.none') : tn('stats.day.count', day.count);
        return {
          ...day,
          name,
          short,
          initial: short.slice(0, 1),
          height: barHeight(day.count, stats.max),
          label: `${name} · ${amount}`,
        };
      }),
    [stats, t, tn, formatDate],
  );

  const footer = tn('stats.week.footer', stats.total, {
    day: bars.find((bar) => bar.isToday)?.name ?? '',
  });

  return (
    <section className={styles.week}>
      <p className={styles.caption} aria-hidden="true">
        {t('stats.week.caption')}
      </p>
      <ul className={styles.chart} aria-label={t('stats.week.caption')}>
        {bars.map((bar) => (
          <li
            key={bar.date}
            className={styles.column}
            data-today={bar.isToday ? '' : undefined}
            data-selected={bar.date === selected ? '' : undefined}
          >
            <button
              type="button"
              className={styles.day}
              aria-label={bar.label}
              aria-pressed={bar.date === selected}
              aria-current={bar.isToday ? 'date' : undefined}
              onClick={() => onSelect(bar.date)}
            >
              <span className={styles.barArea}>
                <span className={styles.count} aria-hidden="true">
                  {bar.count === 0 ? EMPTY_COUNT : bar.count}
                </span>
                <span className={styles.bar} style={{ height: bar.height }} />
              </span>
              <span className={styles.initial} aria-hidden="true">
                {bar.initial}
              </span>
              <span className={styles.full} aria-hidden="true">
                {bar.short}
              </span>
              <span className={styles.marker} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.footer}>{footer}</p>
    </section>
  );
}
