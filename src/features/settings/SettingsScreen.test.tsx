import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type Settings } from '../../types';
import { I18nProvider } from '../../shared/i18n/i18n';
import { SettingsProvider } from '../../shared/settings/settings-provider';
import { SettingsScreen } from './SettingsScreen';

function renderSettings(settings: Partial<Settings> = {}) {
  localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({ ...DEFAULT_SETTINGS, lang: 'en', ...settings }),
  );
  const onClose = vi.fn();
  render(
    <SettingsProvider>
      <I18nProvider>
        <SettingsScreen onClose={onClose} />
      </I18nProvider>
    </SettingsProvider>,
  );
  return { onClose };
}

function button(name: string): HTMLElement {
  return screen.getByRole('button', { name });
}

function stored(): Settings {
  return JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}') as Settings;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('the theme tiles', () => {
  it('offers system alongside the two fixed themes', () => {
    renderSettings();

    expect(button('system')).toHaveAttribute('aria-pressed', 'true');
    expect(button('light')).toHaveAttribute('aria-pressed', 'false');
    expect(button('dark')).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByText('follows your device’s theme, and changes with it'),
    ).toBeInTheDocument();
  });

  it('picks a fixed theme, and comes back to system', () => {
    renderSettings();

    fireEvent.click(button('dark'));
    expect(button('dark')).toHaveAttribute('aria-pressed', 'true');
    expect(stored().theme).toBe('dark');
    // The hint only describes the option that is actually in force.
    expect(screen.queryByText('follows your device’s theme, and changes with it')).toBeNull();

    fireEvent.click(button('system'));
    expect(stored().theme).toBe('system');
  });
});

describe('the lengths', () => {
  it('states both, and moves them a minute at a time', () => {
    renderSettings();

    expect(screen.getByText('25 min')).toBeInTheDocument();
    expect(screen.getByText('5 min')).toBeInTheDocument();

    fireEvent.click(button('increase: focus session'));
    fireEvent.click(button('decrease: break'));

    expect(screen.getByText('26 min')).toBeInTheDocument();
    expect(screen.getByText('4 min')).toBeInTheDocument();
    expect(stored()).toMatchObject({ focusMinutes: 26, breakMinutes: 4 });
  });

  it('stops at each bound instead of pretending to go further', () => {
    renderSettings({ focusMinutes: 90, breakMinutes: 1 });

    expect(button('increase: focus session')).toBeDisabled();
    expect(button('decrease: focus session')).toBeEnabled();
    expect(button('decrease: break')).toBeDisabled();
    expect(button('increase: break')).toBeEnabled();
  });
});

describe('the daily goal', () => {
  it('is a number the reader can set, with what it does spelled out', () => {
    renderSettings();

    fireEvent.click(button('increase: sessions a day'));

    expect(stored().dailyGoal).toBe(5);
    expect(screen.getByLabelText('5 sessions')).toBeInTheDocument();
    expect(screen.getByText(/it is a count, not a streak to keep/)).toBeInTheDocument();
  });

  it('goes no lower than one session and no higher than twelve', () => {
    renderSettings({ dailyGoal: 12 });

    expect(button('increase: sessions a day')).toBeDisabled();

    fireEvent.click(button('decrease: sessions a day'));
    expect(stored().dailyGoal).toBe(11);
  });
});

describe('the method page', () => {
  it('opens from the root, and comes back', () => {
    const { onClose } = renderSettings();

    fireEvent.click(button('the method'));

    expect(screen.getByRole('heading', { name: 'the method', level: 2 })).toBeInTheDocument();
    expect(screen.queryByText('appearance')).toBeNull();

    fireEvent.click(button('back'));

    expect(screen.getByRole('heading', { name: 'settings', level: 2 })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('says where every claim comes from', () => {
    renderSettings();
    fireEvent.click(button('the method'));

    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'https://doi.org/10.1016/j.cognition.2010.12.007',
      'https://doi.org/10.1073/pnas.1516947113',
      'https://doi.org/10.1371/journal.pone.0272460',
      'https://doi.org/10.1111/bjep.12593',
    ]);
    for (const link of links) {
      expect(link).toHaveAttribute('rel', 'noreferrer');
    }
  });

  it('does not claim the numbers are proven', () => {
    renderSettings();
    fireEvent.click(button('the method'));

    expect(screen.getByText(/No study shows 25 and 5 to be the right values/)).toBeInTheDocument();
    expect(screen.getByText(/a kitchen timer, not a laboratory/)).toBeInTheDocument();
  });
});
