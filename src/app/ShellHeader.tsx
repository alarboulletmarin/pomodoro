import type { Layout } from '../types';
import { GearIcon } from '../shared/ui/GearIcon';
import { IconButton } from '../shared/ui/IconButton';
import styles from './ShellHeader.module.css';

export interface ShellHeaderProps {
  layout: Extract<Layout, 'tablet' | 'desktop'>;
  onOpenSettings(): void;
}

export function ShellHeader({ layout, onOpenSettings }: ShellHeaderProps): JSX.Element {
  return (
    <header className={layout === 'desktop' ? styles.titleBar : styles.topBar}>
      {layout === 'desktop' ? (
        <span className={styles.dots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      ) : null}
      <span className={styles.appName}>pomodoro</span>
      <IconButton
        className={styles.gear}
        label="Ouvrir les réglages"
        onClick={onOpenSettings}
        aria-haspopup="dialog"
      >
        <GearIcon size={layout === 'desktop' ? 14 : 18} />
      </IconButton>
    </header>
  );
}
