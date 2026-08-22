import { presetsFor } from '../../domain/timer/durations';
import { useI18n } from '../../shared/i18n/i18n';
import type { Mode } from '../../types';
import styles from './PresetRow.module.css';

export interface PresetRowProps {
  mode: Mode;
  minutes: number;
  onSelect(minutes: number): void;
  className?: string | undefined;
}

export function PresetRow({ mode, minutes, onSelect, className }: PresetRowProps): JSX.Element {
  const { t } = useI18n();

  return (
    <div className={[styles.row, className].filter(Boolean).join(' ')}>
      {presetsFor(mode).map((preset) => (
        <button
          key={preset}
          type="button"
          className={styles.preset}
          aria-pressed={preset === minutes}
          onClick={() => onSelect(preset)}
        >
          {t('timer.preset', { minutes: preset })}
        </button>
      ))}
    </div>
  );
}
