import { useCallback, useState } from 'react';
import { markIntroSeen, shouldShowIntro } from '../domain/onboarding/intro-storage';
import { isSessionUnderway } from '../domain/timer/timer-machine';
import { IntroScreen } from '../features/onboarding/IntroScreen';
import { SettingsScreen, type SettingsPage } from '../features/settings/SettingsScreen';
import { StatsPanel } from '../features/stats/StatsPanel';
import { TimerScreen } from '../features/timer/TimerScreen';
import { useTimer } from '../features/timer/timer-provider';
import { useMediaLayout } from '../shared/hooks/use-media-layout';
import { ShellHeader } from './ShellHeader';
import styles from './App.module.css';

/** `?intro` reopens the first screen on a device that has already seen it. */
function introForced(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('intro');
  } catch {
    return false;
  }
}

export function App(): JSX.Element {
  const layout = useMediaLayout();
  const { state, sessions } = useTimer();
  const [intro, setIntro] = useState(() => shouldShowIntro(introForced(), Date.now()));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsPage, setSettingsPage] = useState<SettingsPage>('root');

  const openSettings = useCallback(() => {
    setSettingsPage('root');
    setSettingsOpen(true);
  }, []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const leaveIntro = useCallback((page: SettingsPage | null) => {
    markIntroSeen();
    setIntro(false);
    if (page === null) return;
    setSettingsPage(page);
    setSettingsOpen(true);
  }, []);

  const isWide = layout === 'tablet' || layout === 'desktop';
  // A running session leaves nothing on screen but the timer, in every layout.
  const active = isSessionUnderway(state.phase);

  // The first visit explains the app before showing it, once, in every layout.
  if (intro) {
    return (
      <div className={styles.shell}>
        <main className={styles.fullSurface}>
          <IntroScreen onStart={() => leaveIntro(null)} onMethod={() => leaveIntro('method')} />
        </main>
      </div>
    );
  }

  if (settingsOpen && !isWide) {
    return (
      <div className={styles.shell}>
        <main className={styles.fullSurface}>
          <SettingsScreen onClose={closeSettings} initialPage={settingsPage} />
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

      <main className={styles.body} data-active={active || undefined}>
        <div className={styles.timerColumn}>
          <TimerScreen onOpenSettings={openSettings} />
        </div>
        {settingsOpen ? (
          <div className={styles.rail}>
            <SettingsScreen onClose={closeSettings} initialPage={settingsPage} />
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
