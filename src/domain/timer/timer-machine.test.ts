import { describe, expect, it } from 'vitest';
import type { TimerEvent, TimerState } from '../../types';
import { initialTimerState, isSessionUnderway, timerReducer } from './timer-machine';

const T0 = 1_700_000_000_000;
const MINUTE = 60_000;

function at(state: TimerState, ...events: TimerEvent[]): TimerState {
  return events.reduce(timerReducer, state);
}

function running(now: number, minutes = 25): TimerState {
  return at(initialTimerState(), { type: 'setMinutes', minutes }, { type: 'start', now });
}

describe('initialTimerState', () => {
  it('starts idle on a 25 minute focus session', () => {
    expect(initialTimerState()).toEqual({
      phase: 'idle',
      mode: 'focus',
      minutes: 25,
      endsAt: null,
      remainingMs: 25 * MINUTE,
    });
  });

  it('returns a fresh object each time', () => {
    expect(initialTimerState()).not.toBe(initialTimerState());
  });

  it('starts on the length it is handed', () => {
    expect(initialTimerState(50)).toMatchObject({ minutes: 50, remainingMs: 50 * MINUTE });
  });

  it('clamps a length that could not be armed', () => {
    expect(initialTimerState(0).minutes).toBe(1);
    expect(initialTimerState(900).minutes).toBe(90);
    expect(initialTimerState(Number.NaN).minutes).toBe(1);
  });
});

describe('setMinutes', () => {
  it('re-arms the clock while idle', () => {
    const next = timerReducer(initialTimerState(), { type: 'setMinutes', minutes: 45 });
    expect(next).toEqual({
      phase: 'idle',
      mode: 'focus',
      minutes: 45,
      endsAt: null,
      remainingMs: 45 * MINUTE,
    });
  });

  it('clamps to the bounds', () => {
    expect(timerReducer(initialTimerState(), { type: 'setMinutes', minutes: 0 }).minutes).toBe(1);
    expect(timerReducer(initialTimerState(), { type: 'setMinutes', minutes: 900 }).minutes).toBe(
      90,
    );
  });

  it('keeps the same reference when the value does not move', () => {
    const state = initialTimerState();
    expect(timerReducer(state, { type: 'setMinutes', minutes: 25 })).toBe(state);
    expect(timerReducer(state, { type: 'setMinutes', minutes: 25.2 })).toBe(state);
  });

  it('is ignored outside idle', () => {
    const active = running(T0);
    expect(timerReducer(active, { type: 'setMinutes', minutes: 45 })).toBe(active);

    const paused = timerReducer(active, { type: 'pause', now: T0 + MINUTE });
    expect(timerReducer(paused, { type: 'setMinutes', minutes: 45 })).toBe(paused);

    const finished = timerReducer(active, { type: 'sync', now: T0 + 25 * MINUTE });
    expect(timerReducer(finished, { type: 'setMinutes', minutes: 45 })).toBe(finished);
  });
});

describe('setMode', () => {
  it('re-arms an idle break', () => {
    expect(
      timerReducer(initialTimerState(), { type: 'setMode', mode: 'break', minutes: 5 }),
    ).toEqual({ phase: 'idle', mode: 'break', minutes: 5, endsAt: null, remainingMs: 5 * MINUTE });
  });

  it('resets a running timer', () => {
    const next = timerReducer(running(T0), { type: 'setMode', mode: 'break', minutes: 5 });
    expect(next.phase).toBe('idle');
    expect(next.endsAt).toBeNull();
    expect(next.remainingMs).toBe(5 * MINUTE);
  });

  it('clamps the requested minutes', () => {
    const next = timerReducer(initialTimerState(), { type: 'setMode', mode: 'break', minutes: 0 });
    expect(next.minutes).toBe(1);
  });
});

describe('start', () => {
  it('arms the deadline from the current time', () => {
    expect(running(T0)).toEqual({
      phase: 'running',
      mode: 'focus',
      minutes: 25,
      endsAt: T0 + 25 * MINUTE,
      remainingMs: 25 * MINUTE,
    });
  });

  it('is ignored outside idle', () => {
    const active = running(T0);
    expect(timerReducer(active, { type: 'start', now: T0 + 5 })).toBe(active);

    const paused = timerReducer(active, { type: 'pause', now: T0 + MINUTE });
    expect(timerReducer(paused, { type: 'start', now: T0 + 2 * MINUTE })).toBe(paused);

    const finished = timerReducer(active, { type: 'sync', now: T0 + 25 * MINUTE });
    expect(timerReducer(finished, { type: 'start', now: T0 + 26 * MINUTE })).toBe(finished);
  });
});

describe('pause and resume', () => {
  it('freezes the remaining time', () => {
    const paused = timerReducer(running(T0), { type: 'pause', now: T0 + 10 * MINUTE });
    expect(paused.phase).toBe('paused');
    expect(paused.endsAt).toBeNull();
    expect(paused.remainingMs).toBe(15 * MINUTE);
  });

  it('never freezes a negative remainder', () => {
    const paused = timerReducer(running(T0), { type: 'pause', now: T0 + 40 * MINUTE });
    expect(paused.remainingMs).toBe(0);
  });

  it('preserves the remainder across an arbitrary wall-clock gap', () => {
    const paused = timerReducer(running(T0), { type: 'pause', now: T0 + 7 * MINUTE + 1234 });
    const resumed = timerReducer(paused, { type: 'resume', now: T0 + 9 * 3_600_000 });

    expect(resumed.phase).toBe('running');
    expect(resumed.remainingMs).toBe(paused.remainingMs);
    expect(resumed.endsAt).toBe(T0 + 9 * 3_600_000 + paused.remainingMs);

    const synced = timerReducer(resumed, { type: 'sync', now: T0 + 9 * 3_600_000 + MINUTE });
    expect(synced.remainingMs).toBe(paused.remainingMs - MINUTE);
  });

  it('is ignored in the wrong phase', () => {
    const idle = initialTimerState();
    expect(timerReducer(idle, { type: 'pause', now: T0 })).toBe(idle);
    expect(timerReducer(idle, { type: 'resume', now: T0 })).toBe(idle);

    const active = running(T0);
    expect(timerReducer(active, { type: 'resume', now: T0 + MINUTE })).toBe(active);

    const paused = timerReducer(active, { type: 'pause', now: T0 + MINUTE });
    expect(timerReducer(paused, { type: 'pause', now: T0 + 2 * MINUTE })).toBe(paused);

    const finished = timerReducer(active, { type: 'sync', now: T0 + 25 * MINUTE });
    expect(timerReducer(finished, { type: 'pause', now: T0 + 26 * MINUTE })).toBe(finished);
    expect(timerReducer(finished, { type: 'resume', now: T0 + 26 * MINUTE })).toBe(finished);
  });
});

describe('sync', () => {
  it('derives the remainder from the deadline', () => {
    const synced = timerReducer(running(T0), { type: 'sync', now: T0 + 3 * MINUTE });
    expect(synced.phase).toBe('running');
    expect(synced.remainingMs).toBe(22 * MINUTE);
  });

  it('keeps the same reference when no millisecond has passed', () => {
    const active = running(T0);
    expect(timerReducer(active, { type: 'sync', now: T0 })).toBe(active);
  });

  it('lands exactly on finished after a backgrounded tab', () => {
    const finished = timerReducer(running(T0), { type: 'sync', now: T0 + 25 * MINUTE });
    expect(finished).toEqual({
      phase: 'finished',
      mode: 'focus',
      minutes: 25,
      endsAt: null,
      remainingMs: 0,
    });
  });

  it('stays finished and never negative after a long sleep', () => {
    const active = running(T0);
    const finished = timerReducer(active, { type: 'sync', now: T0 + 30 * MINUTE });
    expect(finished.remainingMs).toBe(0);

    const later = timerReducer(finished, { type: 'sync', now: T0 + 72 * 3_600_000 });
    expect(later).toBe(finished);

    const straightToFinish = timerReducer(active, { type: 'sync', now: T0 + 72 * 3_600_000 });
    expect(straightToFinish.phase).toBe('finished');
    expect(straightToFinish.remainingMs).toBe(0);
  });

  it('does not drift over many ticks', () => {
    let state = running(T0);
    for (let tick = 1; tick <= 1000; tick += 1) {
      state = timerReducer(state, { type: 'sync', now: T0 + tick * 250 });
    }
    expect(state.remainingMs).toBe(25 * MINUTE - 250_000);
  });

  it('is ignored outside running', () => {
    const idle = initialTimerState();
    expect(timerReducer(idle, { type: 'sync', now: T0 + MINUTE })).toBe(idle);

    const paused = timerReducer(running(T0), { type: 'pause', now: T0 + MINUTE });
    expect(timerReducer(paused, { type: 'sync', now: T0 + 5 * MINUTE })).toBe(paused);
  });
});

describe('end', () => {
  it('re-arms the focus session it gave up on, at its own length', () => {
    const active = running(T0, 45);
    const expected: TimerState = {
      phase: 'idle',
      mode: 'focus',
      minutes: 45,
      endsAt: null,
      remainingMs: 45 * MINUTE,
    };

    expect(timerReducer(active, { type: 'end', focusMinutes: 25 })).toEqual(expected);
    expect(
      timerReducer(timerReducer(active, { type: 'pause', now: T0 + MINUTE }), {
        type: 'end',
        focusMinutes: 25,
      }),
    ).toEqual(expected);
    expect(
      timerReducer(timerReducer(active, { type: 'sync', now: T0 + 45 * MINUTE }), {
        type: 'end',
        focusMinutes: 25,
      }),
    ).toEqual(expected);
  });

  it('leaves a break for a focus session, so the break branch is never a dead end', () => {
    const armedBreak = timerReducer(initialTimerState(), {
      type: 'setMode',
      mode: 'break',
      minutes: 5,
    });
    const expected: TimerState = {
      phase: 'idle',
      mode: 'focus',
      minutes: 30,
      endsAt: null,
      remainingMs: 30 * MINUTE,
    };

    expect(timerReducer(armedBreak, { type: 'end', focusMinutes: 30 })).toEqual(expected);

    const runningBreak = timerReducer(armedBreak, { type: 'start', now: T0 });
    expect(timerReducer(runningBreak, { type: 'end', focusMinutes: 30 })).toEqual(expected);

    const pausedBreak = timerReducer(runningBreak, { type: 'pause', now: T0 + MINUTE });
    expect(timerReducer(pausedBreak, { type: 'end', focusMinutes: 30 })).toEqual(expected);
  });

  it('clamps the focus length it falls back to', () => {
    const armedBreak = timerReducer(initialTimerState(), {
      type: 'setMode',
      mode: 'break',
      minutes: 5,
    });
    expect(timerReducer(armedBreak, { type: 'end', focusMinutes: 0 }).minutes).toBe(1);
    expect(timerReducer(armedBreak, { type: 'end', focusMinutes: 900 }).minutes).toBe(90);
  });
});

describe('reset', () => {
  it('lands on a fresh focus session from every phase', () => {
    const expected: TimerState = {
      phase: 'idle',
      mode: 'focus',
      minutes: 25,
      endsAt: null,
      remainingMs: 25 * MINUTE,
    };
    const active = running(T0, 45);
    const states: TimerState[] = [
      initialTimerState(45),
      timerReducer(initialTimerState(), { type: 'setMode', mode: 'break', minutes: 5 }),
      active,
      timerReducer(active, { type: 'pause', now: T0 + MINUTE }),
      timerReducer(active, { type: 'sync', now: T0 + 45 * MINUTE }),
    ];

    for (const state of states) {
      expect(timerReducer(state, { type: 'reset', focusMinutes: 25 })).toEqual(expected);
    }
  });

  it('drops the length that was scrubbed on the way', () => {
    const scrubbed = timerReducer(initialTimerState(), { type: 'setMinutes', minutes: 73 });
    expect(timerReducer(scrubbed, { type: 'reset', focusMinutes: 25 }).minutes).toBe(25);
  });

  it('clamps the length it is handed', () => {
    expect(timerReducer(initialTimerState(), { type: 'reset', focusMinutes: 0 }).minutes).toBe(1);
    expect(timerReducer(initialTimerState(), { type: 'reset', focusMinutes: 900 }).minutes).toBe(
      90,
    );
  });
});

/**
 * Walks every state the UI can reach, over the edges it actually wires, and checks each one
 * offers a way back to work. The break branch used to be a trap: `end` re-armed the break,
 * so the only exit was sitting the whole thing out.
 */
describe('the reachable flow', () => {
  const FOCUS = 25;
  const BREAK = 5;

  function exits(state: TimerState): TimerEvent[] {
    switch (state.phase) {
      case 'idle':
        return state.mode === 'focus'
          ? [{ type: 'start', now: T0 }]
          : [
              { type: 'start', now: T0 },
              { type: 'reset', focusMinutes: FOCUS },
            ];
      case 'running':
        return [
          { type: 'pause', now: T0 + MINUTE },
          { type: 'end', focusMinutes: FOCUS },
          { type: 'sync', now: T0 + 99 * MINUTE },
        ];
      case 'paused':
        return [
          { type: 'resume', now: T0 + MINUTE },
          { type: 'end', focusMinutes: FOCUS },
        ];
      case 'finished':
        return state.mode === 'focus'
          ? [
              { type: 'setMode', mode: 'break', minutes: BREAK },
              { type: 'setMode', mode: 'focus', minutes: FOCUS },
            ]
          : [{ type: 'setMode', mode: 'focus', minutes: FOCUS }];
    }
  }

  const label = (state: TimerState): string => `${state.phase}/${state.mode}`;

  function walk(): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    const queue: TimerState[] = [initialTimerState(FOCUS)];
    while (queue.length > 0) {
      const state = queue.shift() as TimerState;
      if (graph.has(label(state))) continue;
      const nexts = exits(state).map((event) => timerReducer(state, event));
      graph.set(
        label(state),
        nexts.map(label).filter((next) => next !== label(state)),
      );
      queue.push(...nexts);
    }
    return graph;
  }

  it('reaches all eight states', () => {
    expect([...walk().keys()].sort()).toEqual([
      'finished/break',
      'finished/focus',
      'idle/break',
      'idle/focus',
      'paused/break',
      'paused/focus',
      'running/break',
      'running/focus',
    ]);
  });

  it('leaves every state one press away from a focus session', () => {
    const graph = walk();
    const stuck = [...graph]
      .filter(([from, tos]) => from !== 'idle/focus' && !tos.includes('idle/focus'))
      .map(([from]) => from);

    expect(stuck).toEqual([]);
  });
});

describe('isSessionUnderway', () => {
  it('covers running and paused only', () => {
    expect(isSessionUnderway('running')).toBe(true);
    expect(isSessionUnderway('paused')).toBe(true);
    expect(isSessionUnderway('idle')).toBe(false);
    expect(isSessionUnderway('finished')).toBe(false);
  });
});
