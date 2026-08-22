import { useCallback, useState } from 'react';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { StatsPanel } from '../features/stats/StatsPanel';
import { TimerScreen } from '../features/timer/TimerScreen';
import { useMediaLayout } from '../shared/hooks/use-media-layout';
import { ShellHeader } from './ShellHeader';
import styles from './App.module.css';

export function App(): JSX.Element {
  const layout = useMediaLayout();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const isWide = layout === 'tablet' || layout === 'desktop';

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
        <div className={styles.rail}>
          {settingsOpen ? <SettingsScreen onClose={closeSettings} /> : <StatsPanel sessions={[]} />}
        </div>
      </main>
    </div>
  );
}
