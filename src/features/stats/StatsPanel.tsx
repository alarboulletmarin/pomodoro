import { useMemo } from 'react';
import { monthStats, todayCount, weekStats } from '../../domain/sessions/session-stats';
import { useI18n } from '../../shared/i18n/i18n';
import { Card } from '../../shared/ui/Card';
import type { SessionEntry } from '../../types';
import { MonthHeatmap } from './MonthHeatmap';
import { SessionDots } from './SessionDots';
import { WeekChart } from './WeekChart';
import styles from './StatsPanel.module.css';

export interface StatsPanelProps {
  sessions: SessionEntry[];
}

export function StatsPanel({ sessions }: StatsPanelProps): JSX.Element {
  const { t } = useI18n();

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      today: todayCount(sessions, now),
      week: weekStats(sessions, now),
      month: monthStats(sessions, now),
    };
  }, [sessions]);

  return (
    <Card className={styles.panel}>
      <SessionDots count={stats.today} />
      <div className={styles.sections}>
        <WeekChart stats={stats.week} />
        <div className={styles.divider} aria-hidden="true" />
        <MonthHeatmap stats={stats.month} />
      </div>
      <p className={styles.notice}>{t('stats.notice')}</p>
    </Card>
  );
}
