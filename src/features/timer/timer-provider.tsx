import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { SessionEntry, Suggestion, TimerContextValue } from '../../types';
import { appendSession, loadSessions, saveSessions } from '../../domain/sessions/session-log';
import { todayCount as countToday } from '../../domain/sessions/session-stats';
import { DEFAULT_FOCUS_MINUTES, MS_PER_MINUTE, nextSuggestion } from '../../domain/timer/durations';
import { timerReducer } from '../../domain/timer/timer-machine';
import { loadTimerState, saveTimerState } from '../../domain/timer/timer-storage';
import { useInterval } from '../../shared/hooks/use-interval';
import { useWakeLock } from '../../shared/hooks/use-wake-lock';
import { useSettings } from '../../shared/settings/settings-provider';
import { playChime } from './chime';

const TICK_MS = 250;

const TimerContext = createContext<TimerContextValue | null>(null);

function displayedSecond(remainingMs: number): number {
  return Math.ceil(remainingMs / 1000);
}

export function TimerProvider({ children }: { children: ReactNode }): JSX.Element {
  const { settings } = useSettings();
  const [state, dispatch] = useReducer(timerReducer, undefined, () => loadTimerState(Date.now()));
  const [sessions, setSessions] = useState<SessionEntry[]>(() => loadSessions(Date.now()));
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const stateRef = useRef(state);
  const sessionsRef = useRef(sessions);
  const previousPhase = useRef(state.phase);
  const chime = settings.chime;

  useEffect(() => {
    stateRef.current = state;
    saveTimerState(state);

    const before = previousPhase.current;
    previousPhase.current = state.phase;
    if (before !== 'running' || state.phase !== 'finished') return;

    const now = Date.now();
    const entry: SessionEntry = {
      startedAt: now - state.minutes * MS_PER_MINUTE,
      minutes: state.minutes,
      mode: state.mode,
    };
    const next = appendSession(sessionsRef.current, entry, now);
    sessionsRef.current = next;
    setSessions(next);
    saveSessions(next);
    setSuggestion(nextSuggestion(state.mode));
    if (chime) playChime();
  }, [state, chime]);

  // Derived from the deadline rather than counted down, so a frozen tab lands exact.
  const sync = useCallback(() => {
    const current = stateRef.current;
    if (current.phase !== 'running' || current.endsAt === null) return;
    const now = Date.now();
    const left = current.endsAt - now;
    if (left > 0 && displayedSecond(left) === displayedSecond(current.remainingMs)) return;
    dispatch({ type: 'sync', now });
  }, []);

  useInterval(sync, state.phase === 'running' ? TICK_MS : null);

  useEffect(() => {
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', sync);
    window.addEventListener('pageshow', sync);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', sync);
      window.removeEventListener('pageshow', sync);
    };
  }, [sync]);

  useWakeLock(state.phase === 'running');

  const value = useMemo<TimerContextValue>(() => {
    const totalMs = state.minutes * MS_PER_MINUTE;
    const ratio = totalMs === 0 ? 0 : (totalMs - state.remainingMs) / totalMs;

    return {
      state,
      remainingMs: state.remainingMs,
      progressRatio: Math.min(1, Math.max(0, ratio)),
      todayCount: countToday(sessions, Date.now()),
      sessions,
      suggestion,
      setMinutes: (minutes) => dispatch({ type: 'setMinutes', minutes }),
      start: () => dispatch({ type: 'start', now: Date.now() }),
      pause: () => dispatch({ type: 'pause', now: Date.now() }),
      resume: () => dispatch({ type: 'resume', now: Date.now() }),
      end: () => {
        setSuggestion(null);
        dispatch({ type: 'end' });
      },
      acceptSuggestion: () => {
        if (!suggestion) return;
        setSuggestion(null);
        dispatch({ type: 'setMode', mode: suggestion.mode, minutes: suggestion.minutes });
      },
      dismissSuggestion: () => {
        setSuggestion(null);
        dispatch({ type: 'setMode', mode: 'focus', minutes: DEFAULT_FOCUS_MINUTES });
      },
    };
  }, [state, sessions, suggestion]);

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer(): TimerContextValue {
  const value = useContext(TimerContext);
  if (!value) throw new Error('useTimer must be used inside a TimerProvider');
  return value;
}
