import { Button } from '../../shared/ui/Button';
import styles from './ActionBar.module.css';

export interface ActionBarProps {
  primaryLabel: string;
  secondaryLabel: string | null;
  quietPrimary: boolean;
  hint: string;
  onPrimary(): void;
  onSecondary(): void;
  className?: string | undefined;
}

export function ActionBar({
  primaryLabel,
  secondaryLabel,
  quietPrimary,
  hint,
  onPrimary,
  onSecondary,
  className,
}: ActionBarProps): JSX.Element {
  return (
    <div className={[styles.actions, className].filter(Boolean).join(' ')}>
      <div className={styles.row}>
        <Button
          variant={quietPrimary ? 'outline' : 'primary'}
          className={[styles.primary, quietPrimary ? styles.quiet : null].filter(Boolean).join(' ')}
          onClick={onPrimary}
        >
          {primaryLabel}
        </Button>
        {secondaryLabel === null ? null : (
          <Button variant="quiet" className={styles.secondary} onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
      </div>
      <p className={styles.hint}>{hint}</p>
    </div>
  );
}
