import { useMemo } from 'react';
import { ROLLING_WINDOW_DAYS } from '../../domain/sessions/session-stats';
import { useI18n } from '../../shared/i18n/i18n';
import type { MonthStats } from '../../types';
import { localDate } from './day-label';
import styles from './MonthHeatmap.module.css';

export interface MonthHeatmapProps {
  stats: MonthStats;
  selected: string | null;
  onSelect(date: string): void;
}

export function MonthHeatmap({ stats, selected, onSelect }: MonthHeatmapProps): JSX.Element {
  const { t, tn, formatDate } = useI18n();
  const name = formatDate(new Date(), { month: 'long' });

  // Every cell says which day it is: a bare "3 sessions" told a screen reader nothing.
  const cells = useMemo(
    () =>
      stats.cells.map((cell) => {
        const day = formatDate(localDate(cell.date), { day: 'numeric', month: 'long' });
        const amount = cell.count === 0 ? t('stats.day.none') : tn('stats.day.count', cell.count);
        return { ...cell, label: `${day} · ${amount}` };
      }),
    [stats, t, tn, formatDate],
  );

  return (
    <section className={styles.month}>
      <div className={styles.header}>
        <h2 className={styles.name}>{name}</h2>
        <p className={styles.total}>{tn('stats.month.total', stats.total)}</p>
      </div>
      <ul className={styles.grid} aria-label={name}>
        {cells.map((cell) => (
          <li key={cell.date} className={styles.slot}>
            <button
              type="button"
              className={styles.cell}
              data-level={cell.level}
              data-selected={cell.date === selected ? '' : undefined}
              aria-label={cell.label}
              aria-pressed={cell.date === selected}
              disabled={cell.isFuture}
              onClick={() => onSelect(cell.date)}
            />
          </li>
        ))}
      </ul>
      <p className={styles.footer}>
        {tn('stats.month.footer', stats.activeDays, {
          days: ROLLING_WINDOW_DAYS,
          sessions: tn('stats.day.count', stats.total),
        })}
      </p>
    </section>
  );
}
