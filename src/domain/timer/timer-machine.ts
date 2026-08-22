import type { Phase, TimerEvent, TimerState } from '../../types';
import { clampMinutes, DEFAULT_FOCUS_MINUTES, MS_PER_MINUTE } from './durations';

function armed(mode: TimerState['mode'], minutes: number): TimerState {
  return {
    phase: 'idle',
    mode,
    minutes,
    endsAt: null,
    remainingMs: minutes * MS_PER_MINUTE,
  };
}

/** Running or paused: the phases the app collapses to nothing but the timer for. */
export function isSessionUnderway(phase: Phase): boolean {
  return phase === 'running' || phase === 'paused';
}

export function initialTimerState(): TimerState {
  return armed('focus', DEFAULT_FOCUS_MINUTES);
}

export function timerReducer(state: TimerState, event: TimerEvent): TimerState {
  switch (event.type) {
    case 'setMinutes': {
      if (state.phase !== 'idle') return state;
      const minutes = clampMinutes(event.minutes);
      if (minutes === state.minutes) return state;
      return armed(state.mode, minutes);
    }

    case 'setMode':
      return armed(event.mode, clampMinutes(event.minutes));

    case 'start':
      if (state.phase !== 'idle') return state;
      return { ...state, phase: 'running', endsAt: event.now + state.remainingMs };

    case 'pause':
      if (state.phase !== 'running' || state.endsAt === null) return state;
      return {
        ...state,
        phase: 'paused',
        endsAt: null,
        remainingMs: Math.max(0, state.endsAt - event.now),
      };

    case 'resume':
      if (state.phase !== 'paused') return state;
      return { ...state, phase: 'running', endsAt: event.now + state.remainingMs };

    case 'sync': {
      if (state.phase !== 'running' || state.endsAt === null) return state;
      // Always derived from the deadline: a backgrounded tab or a sleeping device
      // resumes on the exact right value instead of a drifted countdown.
      const remainingMs = state.endsAt - event.now;
      if (remainingMs <= 0) return { ...state, phase: 'finished', endsAt: null, remainingMs: 0 };
      if (remainingMs === state.remainingMs) return state;
      return { ...state, remainingMs };
    }

    case 'end':
      return armed(state.mode, state.minutes);
  }
}
