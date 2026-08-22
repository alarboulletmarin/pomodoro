import { dotCount } from '../../domain/sessions/session-stats';
import { useI18n } from '../../shared/i18n/i18n';
import styles from './SessionDots.module.css';

export interface SessionDotsProps {
  count: number;
  goal: number;
}

export function SessionDots({ count, goal }: SessionDotsProps): JSX.Element {
  const { t, tn } = useI18n();
  const slots = Array.from({ length: dotCount(goal, count) }, (_unused, index) => index);

  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <p className={styles.today}>{tn('stats.today', count)}</p>
        <p className={styles.goal}>
          {count >= goal ? t('stats.goal.reached') : t('stats.goal', { count: goal })}
        </p>
      </div>
      <ul className={styles.dots}>
        {slots.map((slot) => {
          const done = slot < count;
          return (
            <li
              key={slot}
              className={styles.dot}
              data-done={done ? '' : undefined}
              data-over={slot >= goal ? '' : undefined}
              aria-label={done ? t('stats.session.done') : t('stats.session.todo')}
            />
          );
        })}
      </ul>
    </div>
  );
}
