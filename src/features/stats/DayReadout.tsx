import { useI18n } from '../../shared/i18n/i18n';
import type { DayDetail } from '../../types';
import { durationLabel, localDate } from './day-label';
import styles from './DayReadout.module.css';

export interface DayReadoutProps {
  detail: DayDetail;
  isToday: boolean;
}

/** The exact numbers for whichever day is being read — today until another is picked. */
export function DayReadout({ detail, isToday }: DayReadoutProps): JSX.Element {
  const { t, tn, formatDate } = useI18n();

  const day = isToday
    ? t('stats.day.today')
    : formatDate(localDate(detail.date), { weekday: 'long', day: 'numeric', month: 'long' });
  const duration = durationLabel(t, detail.minutes);
  // One text run rather than separated spans, so it is read out as it is written.
  const rest = [tn('stats.day.count', detail.count), duration].filter(Boolean).join(' · ');

  return (
    <p className={styles.readout} role="status" aria-live="polite">
      <span className={styles.day}>{day}</span>
      {` · ${rest}`}
    </p>
  );
}
