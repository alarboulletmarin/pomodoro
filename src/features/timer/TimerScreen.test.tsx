import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  TIMER_STORAGE_KEY,
  type Mode,
  type Phase,
} from '../../types';
import { I18nProvider } from '../../shared/i18n/i18n';
import { SettingsProvider } from '../../shared/settings/settings-provider';
import { TimerProvider } from './timer-provider';
import { TimerScreen } from './TimerScreen';

function seedTimer(phase: Phase, mode: Mode, minutes: number, remainingMs: number): void {
  localStorage.setItem(
    TIMER_STORAGE_KEY,
    JSON.stringify({
      phase,
      mode,
      minutes,
      endsAt: phase === 'running' ? Date.now() + remainingMs : null,
      remainingMs,
    }),
  );
}

function renderTimer() {
  const onOpenSettings = vi.fn();
  render(
    <SettingsProvider>
      <I18nProvider>
        <TimerProvider>
          <TimerScreen onOpenSettings={onOpenSettings} />
        </TimerProvider>
      </I18nProvider>
    </SettingsProvider>,
  );
  return { onOpenSettings };
}

function action(name: string): HTMLElement {
  return screen.getByRole('button', { name });
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, lang: 'en' }));
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-22T09:00:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the collapse rule', () => {
  it.each<Phase>(['running', 'paused'])('keeps only the timer group while %s', (phase) => {
    seedTimer(phase, 'focus', 25, 600_000);
    renderTimer();

    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByTestId('progress-fill')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);

    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('button', { name: '15 min' })).toBeNull();
    expect(screen.queryByRole('button', { name: '25 min' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'settings' })).toBeNull();
    expect(screen.queryByText('focus')).toBeNull();
  });

  it('shows the whole screen while idle', () => {
    renderTimer();

    expect(screen.getByRole('heading', { name: 'ready to start' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '25 min' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'settings' })).toBeInTheDocument();
  });
});

describe('the scrubber keyboard', () => {
  it('follows the arrows, the pages and the bounds while idle', () => {
    renderTimer();
    const scrubber = screen.getByRole('spinbutton');

    expect(scrubber).toHaveAttribute('aria-valuenow', '25');
    expect(scrubber).toHaveAttribute('aria-valuemin', '1');
    expect(scrubber).toHaveAttribute('aria-valuemax', '90');
    expect(scrubber).toHaveAttribute('aria-valuetext', '25 min');

    fireEvent.keyDown(scrubber, { key: 'ArrowUp' });
    expect(scrubber).toHaveAttribute('aria-valuenow', '26');

    fireEvent.keyDown(scrubber, { key: 'ArrowDown' });
    expect(scrubber).toHaveAttribute('aria-valuenow', '25');

    fireEvent.keyDown(scrubber, { key: 'PageUp' });
    expect(scrubber).toHaveAttribute('aria-valuenow', '30');

    fireEvent.keyDown(scrubber, { key: 'PageDown' });
    expect(scrubber).toHaveAttribute('aria-valuenow', '25');

    fireEvent.keyDown(scrubber, { key: 'Home' });
    expect(scrubber).toHaveAttribute('aria-valuenow', '1');

    fireEvent.keyDown(scrubber, { key: 'End' });
    expect(scrubber).toHaveAttribute('aria-valuenow', '90');
  });

  it('is inert once the session is under way', () => {
    seedTimer('running', 'focus', 25, 600_000);
    renderTimer();
    const scrubber = screen.getByRole('spinbutton');

    expect(scrubber).toHaveAttribute('tabindex', '-1');
    expect(scrubber).toHaveAttribute('aria-disabled', 'true');

    fireEvent.keyDown(scrubber, { key: 'ArrowUp' });
    fireEvent.keyDown(scrubber, { key: 'Home' });

    expect(scrubber).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });
});

describe('the primary action', () => {
  it('starts a focus session while idle', () => {
    renderTimer();

    fireEvent.click(action('start'));

    expect(action('pause')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('starts a break when the break mode is armed', () => {
    seedTimer('idle', 'break', 5, 300_000);
    renderTimer();

    expect(screen.getByRole('heading', { name: 'break time' })).toBeInTheDocument();
    fireEvent.click(action('start the break'));

    expect(action('pause')).toBeInTheDocument();
  });

  it('pauses a running session and resumes a paused one', () => {
    seedTimer('running', 'focus', 25, 600_000);
    renderTimer();

    fireEvent.click(action('pause'));

    expect(action('resume')).toBeInTheDocument();
    fireEvent.click(action('resume'));

    expect(action('pause')).toBeInTheDocument();
  });

  it('offers the suggested break when a focus session finishes', () => {
    seedTimer('idle', 'focus', 1, 60_000);
    renderTimer();

    fireEvent.click(action('start'));
    act(() => void vi.advanceTimersByTime(60_300));

    expect(screen.getByRole('heading', { name: 'session done' })).toBeInTheDocument();

    fireEvent.click(action('5 min break'));
    expect(screen.getByRole('heading', { name: 'break time' })).toBeInTheDocument();
    expect(action('start the break')).toBeInTheDocument();
  });

  it('offers a new focus session when a break finishes', () => {
    seedTimer('idle', 'break', 1, 60_000);
    renderTimer();

    fireEvent.click(action('start the break'));
    act(() => void vi.advanceTimersByTime(60_300));

    expect(screen.getByRole('heading', { name: 'break over' })).toBeInTheDocument();

    fireEvent.click(action('new 25 min session'));
    expect(screen.getByRole('heading', { name: 'ready to start' })).toBeInTheDocument();
    expect(action('start')).toBeInTheDocument();
  });

  it('drops the suggestion when the secondary action is taken', () => {
    seedTimer('idle', 'focus', 1, 60_000);
    renderTimer();

    fireEvent.click(action('start'));
    act(() => void vi.advanceTimersByTime(60_300));
    fireEvent.click(action('done for today'));

    expect(screen.getByRole('heading', { name: 'ready to start' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-valuenow', '25');
  });
});

describe('global shortcuts', () => {
  it('starts and ends the session from the keyboard', () => {
    renderTimer();

    fireEvent.keyDown(document.body, { key: ' ' });
    expect(action('pause')).toBeInTheDocument();

    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.getByRole('heading', { name: 'ready to start' })).toBeInTheDocument();
  });

  it('adjusts the duration with the arrows while idle', () => {
    renderTimer();

    fireEvent.keyDown(document.body, { key: 'ArrowUp' });
    expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-valuenow', '26');

    fireEvent.keyDown(document.body, { key: 'ArrowDown' });
    fireEvent.keyDown(document.body, { key: 'ArrowDown' });
    expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-valuenow', '24');
  });

  it('leaves the space key to a focused button', () => {
    renderTimer();
    const preset = screen.getByRole('button', { name: '15 min' });

    fireEvent.keyDown(preset, { key: ' ' });

    expect(action('start')).toBeInTheDocument();
  });
});

describe('announcements', () => {
  it('announces phase changes and never the countdown', () => {
    seedTimer('running', 'focus', 25, 600_000);
    renderTimer();
    const live = screen.getByRole('status');

    expect(live).toHaveTextContent('');

    fireEvent.click(action('pause'));
    expect(live).toHaveTextContent('timer paused');

    fireEvent.click(action('resume'));
    expect(live).toHaveTextContent('timer resumed');
  });
});
