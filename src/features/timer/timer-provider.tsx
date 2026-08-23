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
import type { SessionDurations, SessionEntry, Suggestion, TimerContextValue } from '../../types';
import { appendSession, loadSessions, saveSessions } from '../../domain/sessions/session-log';
import { todayCount as countToday } from '../../domain/sessions/session-stats';
import { clampMinutes, MS_PER_MINUTE, nextSuggestion } from '../../domain/timer/durations';
import { displayedSeconds } from '../../domain/timer/format-clock';
import { timerReducer } from '../../domain/timer/timer-machine';
import {
  loadElapsedWhileAway,
  loadTimerState,
  saveTimerState,
} from '../../domain/timer/timer-storage';
import { useInterval } from '../../shared/hooks/use-interval';
import { useWakeLock } from '../../shared/hooks/use-wake-lock';
import { useSettings } from '../../shared/settings/settings-provider';
import { playChime } from './chime';

const TICK_MS = 250;

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: ReactNode }): JSX.Element {
  const { settings } = useSettings();
  const { focusMinutes, breakMinutes } = settings;
  const [state, dispatch] = useReducer(timerReducer, undefined, () =>
    loadTimerState(Date.now(), settings.focusMinutes),
  );
  const [sessions, setSessions] = useState<SessionEntry[]>(() => loadSessions(Date.now()));
  // Set from the finished screen, where the offer itself is the thing being adjusted.
  const [suggestedMinutes, setSuggestedMinutes] = useState<number | null>(null);
  const [awaySession] = useState<SessionEntry | null>(() => {
    const away = loadElapsedWhileAway(Date.now());
    if (away === null) return null;
    return {
      startedAt: away.endsAt - away.minutes * MS_PER_MINUTE,
      minutes: away.minutes,
      mode: away.mode,
    };
  });

  const stateRef = useRef(state);
  const sessionsRef = useRef(sessions);
  const previousPhase = useRef(state.phase);
  const awayClaimed = useRef(false);
  const chime = settings.chime;

  const logSession = useCallback((entry: SessionEntry): void => {
    const next = appendSession(sessionsRef.current, entry, Date.now());
    sessionsRef.current = next;
    setSessions(next);
    saveSessions(next);
  }, []);

  // The adjustment belongs to the offer on screen, not to the settings: leaving `finished`
  // drops it, so the next suggestion opens on the configured length again.
  useEffect(() => {
    if (state.phase !== 'finished') setSuggestedMinutes(null);
  }, [state.phase]);

  useEffect(() => {
    if (awaySession === null || awayClaimed.current) return;
    awayClaimed.current = true;
    logSession(awaySession);
  }, [awaySession, logSession]);

  useEffect(() => {
    stateRef.current = state;
    saveTimerState(state);

    const before = previousPhase.current;
    previousPhase.current = state.phase;
    if (before !== 'running' || state.phase !== 'finished') return;

    logSession({
      startedAt: Date.now() - state.minutes * MS_PER_MINUTE,
      minutes: state.minutes,
      mode: state.mode,
    });
    if (chime) playChime();
  }, [state, chime, logSession]);

  // Derived from the deadline rather than counted down, so a frozen tab lands exact.
  const sync = useCallback(() => {
    const current = stateRef.current;
    if (current.phase !== 'running' || current.endsAt === null) return;
    const now = Date.now();
    const left = current.endsAt - now;
    if (left > 0 && displayedSeconds(left) === displayedSeconds(current.remainingMs)) return;
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
    const durations: SessionDurations = { focus: focusMinutes, break: breakMinutes };
    const totalMs = state.minutes * MS_PER_MINUTE;
    const ratio = totalMs === 0 ? 0 : (totalMs - state.remainingMs) / totalMs;
    // Every way of dropping the suggestion also leaves `finished`, so the phase alone
    // carries it — including on the reload that lands straight on a finished session.
    const offered = state.phase === 'finished' ? nextSuggestion(state.mode, durations) : null;
    const suggestion: Suggestion | null =
      offered === null ? null : { ...offered, minutes: suggestedMinutes ?? offered.minutes };

    return {
      state,
      remainingMs: state.remainingMs,
      progressRatio: Math.min(1, Math.max(0, ratio)),
      todayCount: countToday(sessions, Date.now()),
      sessions,
      suggestion,
      setMinutes: (minutes) => dispatch({ type: 'setMinutes', minutes }),
      setSuggestionMinutes: (minutes) => setSuggestedMinutes(clampMinutes(minutes)),
      start: () => dispatch({ type: 'start', now: Date.now() }),
      pause: () => dispatch({ type: 'pause', now: Date.now() }),
      resume: () => dispatch({ type: 'resume', now: Date.now() }),
      end: () => dispatch({ type: 'end' }),
      acceptSuggestion: () => {
        if (!suggestion) return;
        dispatch({ type: 'setMode', mode: suggestion.mode, minutes: suggestion.minutes });
      },
      dismissSuggestion: () =>
        dispatch({ type: 'setMode', mode: 'focus', minutes: durations.focus }),
    };
  }, [state, sessions, focusMinutes, breakMinutes, suggestedMinutes]);

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer(): TimerContextValue {
  const value = useContext(TimerContext);
  if (!value) throw new Error('useTimer must be used inside a TimerProvider');
  return value;
}
