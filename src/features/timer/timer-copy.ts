import type { MessageKey, Mode, Phase } from '../../types';

/** What the quiet button under the clock does, once pressed. */
export type SecondaryAction = 'end' | 'reset' | 'skipBreak';

export interface TimerCopy {
  heading: MessageKey;
  subhead: MessageKey;
  hint: MessageKey;
  primary: MessageKey;
  secondary: MessageKey | null;
  /** `null` wherever the primary already covers the only sensible next step. */
  secondaryAction: SecondaryAction | null;
}

export function timerCopy(phase: Phase, mode: Mode): TimerCopy {
  switch (phase) {
    case 'idle':
      return mode === 'focus'
        ? {
            heading: 'timer.heading.idle.focus',
            subhead: 'timer.subhead.idle.focus',
            hint: 'timer.shortcuts.idle.focus',
            primary: 'timer.action.start',
            secondary: null,
            secondaryAction: null,
          }
        : {
            // An armed break is not a commitment: the way back to work sits next to it.
            heading: 'timer.heading.idle.break',
            subhead: 'timer.subhead.idle.break',
            hint: 'timer.shortcuts.idle.break',
            primary: 'timer.action.startBreak',
            secondary: 'timer.action.skipBreak',
            secondaryAction: 'reset',
          };

    case 'running':
      return {
        heading: mode === 'focus' ? 'timer.heading.running.focus' : 'timer.heading.running.break',
        subhead: 'timer.subhead.running',
        hint: 'timer.shortcuts.running',
        primary: 'timer.action.pause',
        secondary: mode === 'focus' ? 'timer.action.end' : 'timer.action.endBreak',
        secondaryAction: 'end',
      };

    case 'paused':
      return {
        heading: 'timer.heading.paused',
        subhead: 'timer.subhead.paused',
        hint: 'timer.shortcuts.paused',
        primary: 'timer.action.resume',
        secondary: mode === 'focus' ? 'timer.action.end' : 'timer.action.endBreak',
        secondaryAction: 'end',
      };

    case 'finished':
      return mode === 'focus'
        ? {
            heading: 'timer.heading.finished.focus',
            subhead: 'timer.subhead.finished.focus',
            hint: 'timer.shortcuts.finished.focus',
            primary: 'timer.action.nextBreak',
            secondary: 'timer.action.skipBreak',
            secondaryAction: 'skipBreak',
          }
        : {
            // Declining here would arm the very session the primary offers: one button.
            heading: 'timer.heading.finished.break',
            subhead: 'timer.subhead.finished.break',
            hint: 'timer.shortcuts.finished.break',
            primary: 'timer.action.nextFocus',
            secondary: null,
            secondaryAction: null,
          };
  }
}
