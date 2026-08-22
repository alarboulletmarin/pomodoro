import { useMemo, useState } from 'react';
import {
  dayDetail,
  monthStats,
  todayCount,
  todayKey,
  weekStats,
} from '../../domain/sessions/session-stats';
import { useI18n } from '../../shared/i18n/i18n';
import { useSettings } from '../../shared/settings/settings-provider';
import { Card } from '../../shared/ui/Card';
import type { SessionEntry } from '../../types';
import { DayReadout } from './DayReadout';
import { MonthHeatmap } from './MonthHeatmap';
import { SessionDots } from './SessionDots';
import { WeekChart } from './WeekChart';
import styles from './StatsPanel.module.css';

export interface StatsPanelProps {
  sessions: SessionEntry[];
}

export function StatsPanel({ sessions }: StatsPanelProps): JSX.Element {
  const { t } = useI18n();
  const { settings } = useSettings();
  const [picked, setPicked] = useState<string | null>(null);

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      today: todayKey(now),
      count: todayCount(sessions, now),
      week: weekStats(sessions, now),
      month: monthStats(sessions, now),
    };
  }, [sessions]);

  // Nothing picked reads today; picking the day already read puts it back.
  const reading = picked ?? stats.today;
  const detail = useMemo(() => dayDetail(sessions, reading), [sessions, reading]);
  const select = (date: string): void => setPicked((previous) => (previous === date ? null : date));

  return (
    <Card className={styles.panel}>
      <SessionDots count={stats.count} goal={settings.dailyGoal} />
      <div className={styles.sections}>
        <WeekChart stats={stats.week} selected={picked} onSelect={select} />
        <div className={styles.divider} aria-hidden="true" />
        <MonthHeatmap stats={stats.month} selected={picked} onSelect={select} />
      </div>
      <DayReadout detail={detail} isToday={reading === stats.today} />
      <p className={styles.notice}>{t('stats.notice')}</p>
    </Card>
  );
}
