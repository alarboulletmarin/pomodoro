import type { MessageKey, Mode, Phase } from '../../types';

export interface TimerCopy {
  heading: MessageKey;
  subhead: MessageKey;
  primary: MessageKey;
  secondary: MessageKey | null;
}

export function timerCopy(phase: Phase, mode: Mode): TimerCopy {
  switch (phase) {
    case 'idle':
      return mode === 'focus'
        ? {
            heading: 'timer.heading.idle.focus',
            subhead: 'timer.subhead.idle.focus',
            primary: 'timer.action.start',
            secondary: null,
          }
        : {
            heading: 'timer.heading.idle.break',
            subhead: 'timer.subhead.idle.break',
            primary: 'timer.action.startBreak',
            secondary: null,
          };

    case 'running':
      return {
        heading: mode === 'focus' ? 'timer.heading.running.focus' : 'timer.heading.running.break',
        subhead: 'timer.subhead.running',
        primary: 'timer.action.pause',
        secondary: 'timer.action.end',
      };

    case 'paused':
      return {
        heading: 'timer.heading.paused',
        subhead: 'timer.subhead.paused',
        primary: 'timer.action.resume',
        secondary: 'timer.action.end',
      };

    case 'finished':
      return mode === 'focus'
        ? {
            heading: 'timer.heading.finished.focus',
            subhead: 'timer.subhead.finished.focus',
            primary: 'timer.action.nextBreak',
            secondary: 'timer.action.doneForToday',
          }
        : {
            heading: 'timer.heading.finished.break',
            subhead: 'timer.subhead.finished.break',
            primary: 'timer.action.nextFocus',
            secondary: 'timer.action.doneForToday',
          };
  }
}
