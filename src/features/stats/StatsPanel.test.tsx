import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type Locale,
  type SessionEntry,
} from '../../types';
import { I18nProvider } from '../../shared/i18n/i18n';
import { SettingsProvider } from '../../shared/settings/settings-provider';
import { StatsPanel } from './StatsPanel';
import weekStyles from './WeekChart.module.css';

// A Wednesday, so today sits mid-week rather than at either end of the chart.
const NOW = new Date('2026-08-19T09:00:00');

function sessionsOn(daysAgo: number, count: number): SessionEntry[] {
  const day = new Date(NOW);
  day.setDate(day.getDate() - daysAgo);
  return Array.from({ length: count }, (_, index) => {
    const startedAt = new Date(day);
    startedAt.setHours(8 + index, 0, 0, 0);
    return { startedAt: startedAt.getTime(), minutes: 25, mode: 'focus' as const };
  });
}

function renderPanel(sessions: SessionEntry[] = [], lang: Locale = 'en') {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, lang }));
  return render(
    <SettingsProvider>
      <I18nProvider>
        <StatsPanel sessions={sessions} />
      </I18nProvider>
    </SettingsProvider>,
  );
}

function bars(): HTMLElement[] {
  return within(screen.getByRole('list', { name: 'week' })).getAllByRole('listitem');
}

function cells(month = 'August'): HTMLElement[] {
  return within(screen.getByRole('list', { name: month })).getAllByRole('listitem');
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('an empty record', () => {
  it('renders the full grid without a single broken measurement', () => {
    renderPanel();

    expect(screen.queryAllByLabelText('upcoming session')).toHaveLength(6);
    expect(screen.queryAllByLabelText('completed session')).toHaveLength(0);
    expect(bars()).toHaveLength(7);
    expect(cells()).toHaveLength(35);

    for (const bar of bars()) {
      expect(bar.querySelector<HTMLElement>(`.${weekStyles.bar}`)?.style.height).toMatch(/^\d+%$/);
    }
    for (const cell of cells()) {
      expect(cell).toHaveAttribute('data-level', '0');
    }
  });

  it('states the empty counts plainly', () => {
    renderPanel();

    expect(screen.getByText('0 sessions today')).toBeInTheDocument();
    expect(screen.getByText('goal 4')).toBeInTheDocument();
    expect(screen.getByText('0 active days out of 30 · 0 sessions')).toBeInTheDocument();
  });
});

describe('the session dots', () => {
  it.each([
    [0, 0],
    [3, 3],
    [6, 6],
    [9, 6],
  ])('fills %i of today’s sessions as %i dots', (today, filled) => {
    renderPanel(sessionsOn(0, today));

    expect(screen.queryAllByLabelText('completed session')).toHaveLength(filled);
    expect(screen.queryAllByLabelText('upcoming session')).toHaveLength(6 - filled);
  });
});

describe('the week chart', () => {
  it('marks today, and only today, without relying on colour', () => {
    renderPanel(sessionsOn(0, 2));

    const marked = bars().filter((bar) => bar.hasAttribute('data-today'));
    expect(marked).toHaveLength(1);

    const [today] = marked;
    expect(today).toHaveAttribute('aria-current', 'date');
    expect(today).toHaveAccessibleName('Wednesday · 2 sessions');
    expect(today?.querySelector(`.${weekStyles.marker}`)).toBeInTheDocument();
    expect(bars().filter((bar) => bar.getAttribute('aria-current') === 'date')).toHaveLength(1);
  });

  it('scales the bars against the busiest day and floors the empty ones', () => {
    renderPanel([...sessionsOn(2, 4), ...sessionsOn(1, 1)]);

    const heights = bars().map(
      (bar) => bar.querySelector<HTMLElement>(`.${weekStyles.bar}`)?.style.height,
    );
    expect(heights).toEqual(['100%', '25%', '6%', '6%', '6%', '6%', '6%']);
  });

  it('reads every day out, whatever the layout hides', () => {
    renderPanel(sessionsOn(1, 1));

    expect(bars()[1]).toHaveAccessibleName('Tuesday · 1 session');
    expect(bars()[3]).toHaveAccessibleName('Thursday · day with no session');
    expect(screen.getByText('Wednesday · 1 session this week')).toBeInTheDocument();
  });
});

describe('the month heatmap', () => {
  it('maps counts onto the four heat levels', () => {
    renderPanel([
      ...sessionsOn(7, 1),
      ...sessionsOn(8, 2),
      ...sessionsOn(9, 3),
      ...sessionsOn(10, 4),
      ...sessionsOn(11, 7),
    ]);

    const levels = cells().map((cell) => cell.getAttribute('data-level'));
    expect(levels.filter((level) => level === '0')).toHaveLength(30);
    expect(levels.filter((level) => level === '1')).toHaveLength(2);
    expect(levels.filter((level) => level === '2')).toHaveLength(1);
    expect(levels.filter((level) => level === '3')).toHaveLength(2);
    expect(screen.getByText('5 active days out of 30 · 17 sessions')).toBeInTheDocument();
  });

  it('labels each cell by what happened on it', () => {
    renderPanel(sessionsOn(9, 3));

    expect(screen.getAllByLabelText('day with no session')).toHaveLength(34);
    expect(screen.getAllByLabelText('3 sessions')).toHaveLength(1);
  });
});

describe('both languages', () => {
  it.each<[Locale, number, string]>([
    ['fr', 0, '0 session aujourd’hui'],
    ['fr', 1, '1 session aujourd’hui'],
    ['fr', 2, '2 sessions aujourd’hui'],
    ['en', 0, '0 sessions today'],
    ['en', 1, '1 session today'],
    ['en', 2, '2 sessions today'],
  ])('says in %s what %i sessions today means', (lang, count, expected) => {
    renderPanel(sessionsOn(0, count), lang);

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('keeps the French month and week wording intact', () => {
    renderPanel(sessionsOn(0, 1), 'fr');

    expect(screen.getByRole('list', { name: 'août' })).toBeInTheDocument();
    expect(screen.getByText('objectif 4')).toBeInTheDocument();
    expect(screen.getByText('mercredi · 1 session cette semaine')).toBeInTheDocument();
    expect(screen.getByText('1 jours actifs sur 30 · 1 sessions')).toBeInTheDocument();
  });
});
