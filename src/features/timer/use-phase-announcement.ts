import { useEffect, useRef, useState } from 'react';
import type { MessageKey, Mode, Phase } from '../../types';

function announcementFor(before: Phase, after: Phase, mode: Mode): MessageKey | null {
  if (after === 'finished') {
    return mode === 'focus' ? 'timer.announce.finished.focus' : 'timer.announce.finished.break';
  }
  if (after === 'paused') return 'timer.announce.paused';
  if (after === 'running' && before === 'paused') return 'timer.announce.resumed';
  return null;
}

/** Phase transitions only — the countdown itself must never reach the live region. */
export function usePhaseAnnouncement(phase: Phase, mode: Mode): MessageKey | null {
  const [key, setKey] = useState<MessageKey | null>(null);
  const previous = useRef(phase);

  useEffect(() => {
    const before = previous.current;
    previous.current = phase;
    if (before === phase) return;
    setKey(announcementFor(before, phase, mode));
  }, [phase, mode]);

  return key;
}
