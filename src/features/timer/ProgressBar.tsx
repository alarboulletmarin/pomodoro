import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  ratio: number;
  className?: string | undefined;
}

/**
 * Hidden from assistive technology on purpose: the digits already carry the exact
 * remaining time and the live region carries the phase, so a progressbar role would
 * only add a percentage nobody asked for.
 */
export function ProgressBar({ ratio, className }: ProgressBarProps): JSX.Element {
  const width = `${Math.round(Math.min(1, Math.max(0, ratio)) * 1000) / 10}%`;

  return (
    <div className={[styles.track, className].filter(Boolean).join(' ')} aria-hidden="true">
      <div className={styles.fill} style={{ width }} data-testid="progress-fill" />
    </div>
  );
}
