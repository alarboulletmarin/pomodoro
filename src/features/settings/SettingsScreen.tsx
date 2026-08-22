import { Button } from '../../shared/ui/Button';
import styles from './SettingsScreen.module.css';

export interface SettingsScreenProps {
  onClose(): void;
}

export function SettingsScreen({ onClose }: SettingsScreenProps): JSX.Element {
  return (
    <section className={styles.settings} aria-label="Réglages">
      <header className={styles.header}>
        <h2 className={styles.heading}>réglages</h2>
        <Button variant="quiet" onClick={onClose}>
          retour
        </Button>
      </header>
    </section>
  );
}
