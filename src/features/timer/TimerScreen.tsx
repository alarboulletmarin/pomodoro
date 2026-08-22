import { useMediaLayout } from '../../shared/hooks/use-media-layout';
import { useI18n } from '../../shared/i18n/i18n';
import { GearIcon } from '../../shared/ui/GearIcon';
import { IconButton } from '../../shared/ui/IconButton';
import { VisuallyHidden } from '../../shared/ui/VisuallyHidden';
import { ActionBar } from './ActionBar';
import { ClockScrubber } from './ClockScrubber';
import { PresetRow } from './PresetRow';
import { ProgressBar } from './ProgressBar';
import { timerCopy } from './timer-copy';
import { useTimer } from './timer-provider';
import { usePhaseAnnouncement } from './use-phase-announcement';
import { useTimerShortcuts } from './use-timer-shortcuts';
import styles from './TimerScreen.module.css';

export interface TimerScreenProps {
  onOpenSettings(): void;
}

export function TimerScreen({ onOpenSettings }: TimerScreenProps): JSX.Element {
  const layout = useMediaLayout();
  const { t } = useI18n();
  const timer = useTimer();
  const { phase, mode, minutes } = timer.state;

  const active = phase === 'running' || phase === 'paused';
  // No shortcut applies once the session is over, so the hint says nothing rather than lying.
  const shortcutHint =
    phase === 'finished' ? null : t(active ? 'timer.shortcuts.active' : 'timer.shortcuts.idle');
  const copy = timerCopy(phase, mode);
  const announcement = usePhaseAnnouncement(phase, mode);
  // Tablet and desktop expose the gear in the shell top bar instead.
  const ownsGear = layout === 'portrait' || layout === 'landscape';

  const onPrimary = (): void => {
    if (phase === 'idle') timer.start();
    else if (phase === 'running') timer.pause();
    else if (phase === 'paused') timer.resume();
    else timer.acceptSuggestion();
  };

  const onSecondary = (): void => {
    if (phase === 'finished') timer.dismissSuggestion();
    else timer.end();
  };

  useTimerShortcuts({
    phase,
    minutes,
    toggle: onPrimary,
    end: timer.end,
    setMinutes: timer.setMinutes,
  });

  return (
    <section className={styles.timer} data-active={active ? '' : undefined}>
      {active ? null : (
        <header className={styles.header}>
          <div className={styles.titles}>
            <h1 className={styles.heading}>{t(copy.heading)}</h1>
            <p className={styles.subhead}>{t(copy.subhead)}</p>
          </div>
          <div className={styles.meta}>
            <span className={styles.mode}>{t(`timer.mode.${mode}`)}</span>
            {ownsGear ? (
              <IconButton
                label={t('a11y.openSettings')}
                onClick={onOpenSettings}
                aria-haspopup="dialog"
              >
                <GearIcon />
              </IconButton>
            ) : null}
          </div>
        </header>
      )}

      <div className={styles.panel}>
        {phase === 'idle' ? (
          <PresetRow
            className={styles.presets}
            mode={mode}
            minutes={minutes}
            onSelect={timer.setMinutes}
          />
        ) : null}
        <ClockScrubber
          className={styles.scrubber}
          minutes={minutes}
          remainingMs={timer.remainingMs}
          idle={phase === 'idle'}
          onChange={timer.setMinutes}
        />
        <ProgressBar className={styles.progress} ratio={timer.progressRatio} />
        <ActionBar
          className={styles.actions}
          primaryLabel={t(copy.primary, { minutes: timer.suggestion?.minutes ?? minutes })}
          secondaryLabel={copy.secondary === null ? null : t(copy.secondary)}
          quietPrimary={phase === 'running'}
          hint={shortcutHint}
          onPrimary={onPrimary}
          onSecondary={onSecondary}
        />
      </div>

      <VisuallyHidden live="polite">{announcement === null ? '' : t(announcement)}</VisuallyHidden>
    </section>
  );
}
