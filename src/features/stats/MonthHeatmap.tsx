import { ROLLING_WINDOW_DAYS } from '../../domain/sessions/session-stats';
import { useI18n } from '../../shared/i18n/i18n';
import type { MonthStats } from '../../types';
import styles from './MonthHeatmap.module.css';

export interface MonthHeatmapProps {
  stats: MonthStats;
}

export function MonthHeatmap({ stats }: MonthHeatmapProps): JSX.Element {
  const { t, tn, formatDate } = useI18n();
  const name = formatDate(new Date(), { month: 'long' });

  return (
    <section className={styles.month}>
      <div className={styles.header}>
        <h2 className={styles.name}>{name}</h2>
        <p className={styles.total}>{tn('stats.month.total', stats.total)}</p>
      </div>
      <ul className={styles.grid} aria-label={name}>
        {stats.cells.map((cell) => (
          <li
            key={cell.date}
            className={styles.cell}
            data-level={cell.level}
            aria-label={cell.count === 0 ? t('stats.day.none') : tn('stats.day.count', cell.count)}
          />
        ))}
      </ul>
      <p className={styles.footer}>
        {t('stats.month.footer', {
          active: stats.activeDays,
          days: ROLLING_WINDOW_DAYS,
          count: stats.total,
        })}
      </p>
    </section>
  );
}
