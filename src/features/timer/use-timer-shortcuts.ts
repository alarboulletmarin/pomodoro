import { useEffect, useRef } from 'react';
import { clampMinutes } from '../../domain/timer/durations';
import type { Phase } from '../../types';

const WIDGETS = 'input, textarea, select, button, [contenteditable="true"], [role="spinbutton"]';
const FIELDS = 'input, textarea, select, [contenteditable="true"]';

export interface TimerShortcuts {
  phase: Phase;
  minutes: number;
  toggle(): void;
  end(): void;
  setMinutes(minutes: number): void;
}

function matches(target: EventTarget | null, selector: string): boolean {
  return target instanceof Element && target.closest(selector) !== null;
}

export function useTimerShortcuts(shortcuts: TimerShortcuts): void {
  const latest = useRef(shortcuts);
  latest.current = shortcuts;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const { phase, minutes, toggle, end, setMinutes } = latest.current;

      if (event.key === 'Escape') {
        if (matches(event.target, FIELDS)) return;
        if (phase === 'running' || phase === 'paused') end();
        return;
      }

      // Anything already keyboard-operable keeps its own meaning for space and arrows.
      if (matches(event.target, WIDGETS)) return;

      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        toggle();
        return;
      }

      if (phase !== 'idle') return;
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        setMinutes(clampMinutes(minutes + (event.key === 'ArrowUp' ? 1 : -1)));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
