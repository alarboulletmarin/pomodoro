import { MS_PER_MINUTE } from '../../domain/timer/durations';
import { isSessionUnderway } from '../../domain/timer/timer-machine';
import type { MessageKey, Phase } from '../../types';
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

const SHORTCUT_HINTS = {
  idle: 'timer.shortcuts.idle',
  running: 'timer.shortcuts.active',
  paused: 'timer.shortcuts.paused',
  finished: 'timer.shortcuts.finished',
} as const satisfies Record<Phase, MessageKey>;

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

  const onSecondary = (): void => {
    if (phase === 'finished') timer.dismissSuggestion();
    else timer.end();
  };

  useTimerShortcuts({
    phase,
    minutes: armedMinutes,
    toggle: onPrimary,
    end: timer.end,
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
          hint={t(SHORTCUT_HINTS[phase])}
          onPrimary={onPrimary}
          onSecondary={onSecondary}
        />
      </div>

      <VisuallyHidden live="polite">{announcement === null ? '' : t(announcement)}</VisuallyHidden>
    </section>
  );
}
