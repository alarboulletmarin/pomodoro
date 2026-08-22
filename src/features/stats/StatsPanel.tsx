import type { SessionEntry } from '../../types';
import { Card } from '../../shared/ui/Card';
import styles from './StatsPanel.module.css';

export interface StatsPanelProps {
  sessions: SessionEntry[];
}

export function StatsPanel({ sessions }: StatsPanelProps): JSX.Element {
  return (
    <Card className={styles.stats} aria-label="Statistiques">
      <p className={styles.total}>{sessions.length} séances</p>
    </Card>
  );
}
