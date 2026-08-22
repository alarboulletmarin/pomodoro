import { useCallback, useState } from 'react';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { StatsPanel } from '../features/stats/StatsPanel';
import { TimerScreen } from '../features/timer/TimerScreen';
import { useTimer } from '../features/timer/timer-provider';
import { useMediaLayout } from '../shared/hooks/use-media-layout';
import { ShellHeader } from './ShellHeader';
import styles from './App.module.css';

export function App(): JSX.Element {
  const layout = useMediaLayout();
  const { state, sessions } = useTimer();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const isWide = layout === 'tablet' || layout === 'desktop';
  // A running session leaves nothing on screen but the timer, in every layout.
  const active = state.phase === 'running' || state.phase === 'paused';

  if (settingsOpen && !isWide) {
    return (
      <div className={styles.shell}>
        <main className={styles.fullSurface}>
          <SettingsScreen onClose={closeSettings} />
        </main>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      {isWide ? (
        <ShellHeader
          layout={layout === 'desktop' ? 'desktop' : 'tablet'}
          onOpenSettings={openSettings}
        />
      ) : null}

      <main className={styles.body}>
        <div className={styles.timerColumn}>
          <TimerScreen onOpenSettings={openSettings} />
        </div>
        {settingsOpen ? (
          <div className={styles.rail}>
            <SettingsScreen onClose={closeSettings} />
          </div>
        ) : null}
        {settingsOpen || active ? null : (
          <div className={styles.rail}>
            <StatsPanel sessions={sessions} />
          </div>
        )}
      </main>
    </div>
  );
}
