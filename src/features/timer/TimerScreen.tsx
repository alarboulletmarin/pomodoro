import { useMediaLayout } from '../../shared/hooks/use-media-layout';
import { Card } from '../../shared/ui/Card';
import { GearIcon } from '../../shared/ui/GearIcon';
import { IconButton } from '../../shared/ui/IconButton';
import styles from './TimerScreen.module.css';

export interface TimerScreenProps {
  onOpenSettings(): void;
}

export function TimerScreen({ onOpenSettings }: TimerScreenProps): JSX.Element {
  const layout = useMediaLayout();
  // Tablet and desktop expose the gear in the shell top bar instead.
  const ownsGear = layout === 'portrait' || layout === 'landscape';

  return (
    <section className={styles.timer} aria-label="Minuteur">
      <header className={styles.header}>
        <h1 className={styles.heading}>pomodoro</h1>
        {ownsGear ? (
          <IconButton label="Ouvrir les réglages" onClick={onOpenSettings} aria-haspopup="dialog">
            <GearIcon />
          </IconButton>
        ) : null}
      </header>
      <Card className={styles.card}>
        <p className={styles.digits}>25:00</p>
      </Card>
    </section>
  );
}
