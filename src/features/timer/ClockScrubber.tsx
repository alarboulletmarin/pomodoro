import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import {
  clampMinutes,
  MAX_MINUTES,
  MIN_MINUTES,
  minutesFromScrub,
} from '../../domain/timer/durations';
import { formatClock, formatMinutesClock } from '../../domain/timer/format-clock';
import { useI18n } from '../../shared/i18n/i18n';
import styles from './ClockScrubber.module.css';

const KEY_STEPS: Record<string, number> = {
  ArrowUp: 1,
  ArrowDown: -1,
  PageUp: 5,
  PageDown: -5,
};

export interface ClockScrubberProps {
  minutes: number;
  remainingMs: number;
  idle: boolean;
  onChange(minutes: number): void;
  className?: string | undefined;
}

function capture(element: Element, pointerId: number, take: boolean): void {
  try {
    if (take) element.setPointerCapture(pointerId);
    else element.releasePointerCapture(pointerId);
  } catch {
    // Pointer capture is a nicety; the drag still tracks without it.
  }
}

export function ClockScrubber({
  minutes,
  remainingMs,
  idle,
  onChange,
  className,
}: ClockScrubberProps): JSX.Element {
  const { t } = useI18n();
  const grab = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; startY: number; startMinutes: number } | null>(null);

  // Registered by hand because React's onWheel is passive and cannot stop the scroll.
  useEffect(() => {
    const node = grab.current;
    if (!node || !idle) return;
    const onWheel = (event: WheelEvent): void => {
      if (event.deltaY === 0) return;
      event.preventDefault();
      onChange(clampMinutes(minutes + (event.deltaY < 0 ? 1 : -1)));
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [idle, minutes, onChange]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (!idle) return;
    capture(event.currentTarget, event.pointerId, true);
    drag.current = { pointerId: event.pointerId, startY: event.clientY, startMinutes: minutes };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    onChange(minutesFromScrub(active.startMinutes, active.startY - event.clientY));
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    capture(event.currentTarget, event.pointerId, false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!idle) return;
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      onChange(event.key === 'Home' ? MIN_MINUTES : MAX_MINUTES);
      return;
    }
    const step = KEY_STEPS[event.key];
    if (step === undefined) return;
    event.preventDefault();
    onChange(clampMinutes(minutes + step));
  };

  return (
    <div className={[styles.scrubber, className].filter(Boolean).join(' ')}>
      <div
        ref={grab}
        className={styles.grab}
        data-idle={idle ? '' : undefined}
        role="spinbutton"
        tabIndex={idle ? 0 : -1}
        aria-label={t('timer.scrubber.label')}
        aria-valuenow={minutes}
        aria-valuemin={MIN_MINUTES}
        aria-valuemax={MAX_MINUTES}
        aria-valuetext={t('timer.preset', { minutes })}
        aria-disabled={idle ? undefined : true}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        {idle ? (
          <span className={styles.ghost} aria-hidden="true">
            {minutes < MAX_MINUTES ? formatMinutesClock(minutes + 1) : ''}
          </span>
        ) : null}
        <span className={styles.digits}>{formatClock(remainingMs)}</span>
        {idle ? (
          <span className={styles.ghost} aria-hidden="true">
            {minutes > MIN_MINUTES ? formatMinutesClock(minutes - 1) : ''}
          </span>
        ) : null}
      </div>
      {idle ? <p className={styles.hint}>{t('timer.scrubHint')}</p> : null}
    </div>
  );
}
