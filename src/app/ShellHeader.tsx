import type { Layout } from '../types';
import { useTimer } from '../features/timer/timer-provider';
import { useI18n } from '../shared/i18n/i18n';
import { GearIcon } from '../shared/ui/GearIcon';
import { IconButton } from '../shared/ui/IconButton';
import styles from './ShellHeader.module.css';

export interface ShellHeaderProps {
  layout: Extract<Layout, 'tablet' | 'desktop'>;
  onOpenSettings(): void;
}

export function ShellHeader({ layout, onOpenSettings }: ShellHeaderProps): JSX.Element {
  const { t, tn } = useI18n();
  const { state, todayCount } = useTimer();

  const isDesktop = layout === 'desktop';
  const active = state.phase === 'running' || state.phase === 'paused';

  return (
    <header className={isDesktop ? styles.titleBar : styles.topBar}>
      <span className={styles.appName}>{t('app.name')}</span>

      {/* During a session the top bar carries nothing that invites a detour. */}
      {active ? null : (
        <div className={styles.meta}>
          <span>{t(`timer.mode.${state.mode}`)}</span>
          <span className={isDesktop ? styles.dot : styles.separator} aria-hidden="true" />
          <span>{tn('stats.today', todayCount)}</span>
          <IconButton
            label={t('a11y.openSettings')}
            onClick={onOpenSettings}
            aria-haspopup="dialog"
          >
            <GearIcon size={isDesktop ? 14 : 18} />
          </IconButton>
        </div>
      )}
    </header>
  );
}
