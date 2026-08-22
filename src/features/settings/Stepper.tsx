import { useI18n } from '../../shared/i18n/i18n';
import styles from './Stepper.module.css';

export interface StepperProps {
  name: string;
  /** The current value as shown — `25 min`, `4`. */
  value: string;
  /** What a screen reader hears instead, when the shown value drops the unit. */
  announce?: string;
  current: number;
  min: number;
  max: number;
  onChange(next: number): void;
}

export function Stepper({
  name,
  value,
  announce,
  current,
  min,
  max,
  onChange,
}: StepperProps): JSX.Element {
  const { t } = useI18n();

  return (
    <div className={styles.row}>
      <span className={styles.name}>{name}</span>
      <span className={styles.control}>
        <button
          type="button"
          className={styles.step}
          aria-label={t('settings.stepper.less', { name })}
          disabled={current <= min}
          onClick={() => onChange(current - 1)}
        >
          <span aria-hidden="true">−</span>
        </button>
        {/* The buttons keep their label as the number moves, so the value carries the change. */}
        <output className={styles.value} aria-live="polite" aria-label={announce ?? value}>
          {value}
        </output>
        <button
          type="button"
          className={styles.step}
          aria-label={t('settings.stepper.more', { name })}
          disabled={current >= max}
          onClick={() => onChange(current + 1)}
        >
          <span aria-hidden="true">+</span>
        </button>
      </span>
    </div>
  );
}
