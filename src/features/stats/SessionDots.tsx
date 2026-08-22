import { DAILY_GOAL, SESSION_DOTS } from '../../domain/sessions/session-stats';
import { useI18n } from '../../shared/i18n/i18n';
import styles from './SessionDots.module.css';

const SLOTS = Array.from({ length: SESSION_DOTS }, (_, index) => index);

export interface SessionDotsProps {
  count: number;
}

export function SessionDots({ count }: SessionDotsProps): JSX.Element {
  const { t, tn } = useI18n();

  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <p className={styles.today}>{tn('stats.today', count)}</p>
        <p className={styles.goal}>{t('stats.goal', { count: DAILY_GOAL })}</p>
      </div>
      <ul className={styles.dots}>
        {SLOTS.map((slot) => {
          const done = slot < count;
          return (
            <li
              key={slot}
              className={styles.dot}
              data-done={done ? '' : undefined}
              aria-label={done ? t('stats.session.done') : t('stats.session.todo')}
            />
          );
        })}
      </ul>
    </div>
  );
}
