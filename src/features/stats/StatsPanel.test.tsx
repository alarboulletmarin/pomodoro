import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type Locale,
  type SessionEntry,
  type Settings,
} from '../../types';
import { I18nProvider } from '../../shared/i18n/i18n';
import { SettingsProvider } from '../../shared/settings/settings-provider';
import { StatsPanel } from './StatsPanel';
import weekStyles from './WeekChart.module.css';

// A Wednesday, so today sits mid-week rather than at either end of the chart.
const NOW = new Date('2026-08-19T09:00:00');

function sessionsOn(daysAgo: number, count: number, minutes = 25): SessionEntry[] {
  const day = new Date(NOW);
  day.setDate(day.getDate() - daysAgo);
  return Array.from({ length: count }, (_unused, index) => {
    const startedAt = new Date(day);
    startedAt.setHours(8 + index, 0, 0, 0);
    return { startedAt: startedAt.getTime(), minutes, mode: 'focus' as const };
  });
}

function renderPanel(
  sessions: SessionEntry[] = [],
  lang: Locale = 'en',
  settings: Partial<Settings> = {},
) {
  localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({ ...DEFAULT_SETTINGS, lang, ...settings }),
  );
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

function barButtons(week = 'week'): HTMLElement[] {
  return within(screen.getByRole('list', { name: week })).getAllByRole('button');
}

function cells(month = 'August'): HTMLElement[] {
  return within(screen.getByRole('list', { name: month })).getAllByRole('button', {
    hidden: true,
  });
}

function readout(): HTMLElement {
  return screen.getByRole('status');
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

    expect(screen.queryAllByLabelText('upcoming session')).toHaveLength(4);
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
    expect(readout()).toHaveTextContent('today · 0 sessions');
  });
});

describe('the session dots', () => {
  it.each([
    [0, 0, 4],
    [3, 3, 4],
    [4, 4, 4],
    [6, 6, 6],
    [40, 12, 12],
  ])('fills %i of today’s sessions as %i of %i dots', (today, filled, total) => {
    renderPanel(sessionsOn(0, today));

    expect(screen.queryAllByLabelText('completed session')).toHaveLength(filled);
    expect(screen.queryAllByLabelText('upcoming session')).toHaveLength(total - filled);
  });

  it('follows the goal held in the settings', () => {
    renderPanel([], 'en', { dailyGoal: 8 });

    expect(screen.queryAllByLabelText('upcoming session')).toHaveLength(8);
    expect(screen.getByText('goal 8')).toBeInTheDocument();
  });

  it('says the goal is met instead of restating it', () => {
    renderPanel(sessionsOn(0, 2), 'en', { dailyGoal: 2 });

    expect(screen.getByText('goal reached')).toBeInTheDocument();
    expect(screen.queryByText('goal 2')).toBeNull();
  });
});

describe('the week chart', () => {
  it('marks today, and only today, without relying on colour', () => {
    renderPanel(sessionsOn(0, 2));

    const marked = bars().filter((bar) => bar.hasAttribute('data-today'));
    expect(marked).toHaveLength(1);

    const [today] = marked;
    expect(within(today as HTMLElement).getByRole('button')).toHaveAttribute(
      'aria-current',
      'date',
    );
    expect(within(today as HTMLElement).getByRole('button')).toHaveAccessibleName(
      'Wednesday · 2 sessions',
    );
    expect(today?.querySelector(`.${weekStyles.marker}`)).toBeInTheDocument();
    expect(barButtons().filter((bar) => bar.getAttribute('aria-current') === 'date')).toHaveLength(
      1,
    );
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

    expect(barButtons()[1]).toHaveAccessibleName('Tuesday · 1 session');
    expect(barButtons()[3]).toHaveAccessibleName('Thursday · day with no session');
    expect(screen.getByText('Wednesday · 1 session this week')).toBeInTheDocument();
  });

  it('shows the count above every bar, empty days included', () => {
    renderPanel(sessionsOn(0, 3));

    const counts = bars().map(
      (bar) => bar.querySelector<HTMLElement>(`.${weekStyles.count}`)?.textContent,
    );
    expect(counts).toEqual(['–', '–', '3', '–', '–', '–', '–']);
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

  it('labels each cell by its date and what happened on it', () => {
    renderPanel(sessionsOn(9, 3));

    expect(screen.getByRole('button', { name: '10 August · 3 sessions' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '11 August · day with no session' }),
    ).toBeInTheDocument();
  });

  it('leaves the days still to come out of reach', () => {
    renderPanel();

    // Today is Wednesday: the four days closing the grid have not happened yet.
    const reachable = cells().filter((cell) => !(cell as HTMLButtonElement).disabled);
    expect(reachable).toHaveLength(31);
    expect(cells().at(-1)).toBeDisabled();
  });
});

describe('picking a day', () => {
  it('reads today until another day is picked', () => {
    renderPanel([...sessionsOn(0, 2), ...sessionsOn(2, 1, 45)]);

    expect(readout()).toHaveTextContent('today · 2 sessions · 50 min');

    fireEvent.click(barButtons()[0] as HTMLElement);

    expect(readout()).toHaveTextContent('Monday 17 August · 1 session · 45 min');
    expect(barButtons()[0]).toHaveAttribute('aria-pressed', 'true');
  });

  it('goes back to today when the same day is picked again', () => {
    renderPanel(sessionsOn(0, 1));

    fireEvent.click(barButtons()[1] as HTMLElement);
    expect(readout()).toHaveTextContent('Tuesday 18 August · 0 sessions');

    fireEvent.click(barButtons()[1] as HTMLElement);
    expect(readout()).toHaveTextContent('today · 1 session · 25 min');
    expect(barButtons()[1]).toHaveAttribute('aria-pressed', 'false');
  });

  it('reads a day picked out of the month grid', () => {
    renderPanel(sessionsOn(9, 4, 30));

    fireEvent.click(screen.getByRole('button', { name: '10 August · 4 sessions' }));

    expect(readout()).toHaveTextContent('Monday 10 August · 4 sessions · 2 h');
  });

  it('states hours and minutes once the day runs past the hour', () => {
    renderPanel(sessionsOn(0, 3));

    expect(readout()).toHaveTextContent('today · 3 sessions · 1 h 15');
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

  it('keeps both halves of the footer singular on a single day and a single session', () => {
    renderPanel(sessionsOn(0, 1));

    expect(screen.getByText('1 active day out of 30 · 1 session')).toBeInTheDocument();
  });

  it('keeps the French month and week wording intact', () => {
    renderPanel(sessionsOn(0, 1), 'fr');

    expect(screen.getByRole('list', { name: 'août' })).toBeInTheDocument();
    expect(screen.getByText('objectif 4')).toBeInTheDocument();
    expect(screen.getByText('mercredi · 1 session cette semaine')).toBeInTheDocument();
    expect(screen.getByText('1 jour actif sur 30 · 1 session')).toBeInTheDocument();
    expect(readout()).toHaveTextContent('aujourd’hui · 1 session · 25 min');
  });

  it('names a picked day in French', () => {
    renderPanel(sessionsOn(1, 1), 'fr');

    fireEvent.click(barButtons('semaine')[1] as HTMLElement);

    expect(readout()).toHaveTextContent('mardi 18 août · 1 session · 25 min');
  });
});
