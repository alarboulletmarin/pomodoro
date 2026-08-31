import { MS_PER_MINUTE } from '../../domain/timer/durations';
import { isSessionUnderway } from '../../domain/timer/timer-machine';
import { useMediaLayout } from '../../shared/hooks/use-media-layout';
import { useI18n } from '../../shared/i18n/i18n';
import { GearIcon } from '../../shared/ui/GearIcon';
import { IconButton } from '../../shared/ui/IconButton';
import { VisuallyHidden } from '../../shared/ui/VisuallyHidden';
import { ActionBar } from './ActionBar';
import { ClockScrubber } from './ClockScrubber';
import { PresetRow } from './PresetRow';
import { ProgressBar } from './ProgressBar';
import { timerCopy, type SecondaryAction } from './timer-copy';
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

  const active = isSessionUnderway(phase);
  // Once the session is over the panel arms the next one: the presets, the digits and the bar
  // all describe the offer, so its length is settable here instead of only in the settings.
  const offer = timer.suggestion;
  const armedMode = offer?.mode ?? mode;
  const armedMinutes = offer?.minutes ?? minutes;
  const settable = phase === 'idle' || offer !== null;
  const setArmedMinutes = offer === null ? timer.setMinutes : timer.setSuggestionMinutes;
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

  // One quiet button per screen, one meaning: the way out of whatever is on it. Escape is
  // bound to that same action, so no screen offers a way out the keyboard cannot take.
  const exits: Record<SecondaryAction, () => void> = {
    end: timer.end,
    reset: timer.reset,
    skipBreak: timer.dismissSuggestion,
  };
  const onSecondary = copy.secondaryAction === null ? null : exits[copy.secondaryAction];

  useTimerShortcuts({
    phase,
    minutes: armedMinutes,
    toggle: onPrimary,
    escape: onSecondary,
    setMinutes: setArmedMinutes,
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
        {settable ? (
          <PresetRow
            className={styles.presets}
            mode={armedMode}
            minutes={armedMinutes}
            onSelect={setArmedMinutes}
          />
        ) : null}
        <ClockScrubber
          className={styles.scrubber}
          minutes={armedMinutes}
          remainingMs={offer === null ? timer.remainingMs : armedMinutes * MS_PER_MINUTE}
          mode={armedMode}
          editable={settable}
          onChange={setArmedMinutes}
        />
        <ProgressBar className={styles.progress} ratio={offer === null ? timer.progressRatio : 0} />
        <ActionBar
          className={styles.actions}
          primaryLabel={t(copy.primary, { minutes: armedMinutes })}
          secondaryLabel={copy.secondary === null ? null : t(copy.secondary)}
          quietPrimary={phase === 'running'}
          hint={t(copy.hint)}
          onPrimary={onPrimary}
          onSecondary={onSecondary}
        />
      </div>

      <VisuallyHidden live="polite">{announcement === null ? '' : t(announcement)}</VisuallyHidden>
    </section>
  );
}
