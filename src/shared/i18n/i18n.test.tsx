import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type Locale, type Messages } from '../../types';
import { SettingsProvider } from '../settings/settings-provider';
import { I18nProvider, useI18n } from './i18n';
import { interpolate } from './interpolate';
import { en } from './locales/en';
import { fr } from './locales/fr';

const LOCALES: Record<Locale, Messages> = { fr, en };

function Probe(): JSX.Element {
  const { lang, setLang, t, tn } = useI18n();
  return (
    <div>
      <p data-testid="title">{t('settings.title')}</p>
      <p data-testid="version">{t('settings.version', { version: '1.2.3' })}</p>
      <p data-testid="zero">{tn('stats.today', 0)}</p>
      <p data-testid="one">{tn('stats.today', 1)}</p>
      <p data-testid="many">{tn('stats.today', 2)}</p>
      <p data-testid="week">{tn('stats.week.footer', 1, { day: 'lundi' })}</p>
      <button type="button" onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}>
        switch
      </button>
    </div>
  );
}

function renderIn(lang: Locale): void {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, lang }));
  render(
    <SettingsProvider>
      <I18nProvider>
        <Probe />
      </I18nProvider>
    </SettingsProvider>,
  );
}

const text = (id: string): string => screen.getByTestId(id).textContent ?? '';

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.lang = 'fr';
});

describe('interpolate', () => {
  it('replaces every occurrence of a placeholder', () => {
    expect(interpolate('{count} sur {count}', { count: 3 })).toBe('3 sur 3');
  });

  it('leaves an absent placeholder untouched', () => {
    expect(interpolate('{day} · {count}', { count: 2 })).toBe('{day} · 2');
  });

  it('returns the template unchanged without params', () => {
    expect(interpolate('{minutes} min')).toBe('{minutes} min');
  });
});

describe('tn', () => {
  it('keeps the singular for zero and one in French', () => {
    renderIn('fr');
    expect(text('zero')).toBe('0 session aujourd’hui');
    expect(text('one')).toBe('1 session aujourd’hui');
    expect(text('many')).toBe('2 sessions aujourd’hui');
  });

  it('keeps the singular for one only in English', () => {
    renderIn('en');
    expect(text('zero')).toBe('0 sessions today');
    expect(text('one')).toBe('1 session today');
    expect(text('many')).toBe('2 sessions today');
  });

  it('injects count alongside the caller parameters', () => {
    renderIn('fr');
    expect(text('week')).toBe('lundi · 1 session cette semaine');
  });
});

describe('t', () => {
  it('interpolates parameters', () => {
    renderIn('fr');
    expect(text('version')).toBe('version 1.2.3');
  });
});

describe('setLang', () => {
  it('switches consumers and <html lang> in place, without a reload', () => {
    renderIn('fr');
    expect(text('title')).toBe('réglages');

    fireEvent.click(screen.getByRole('button', { name: 'switch' }));

    expect(text('title')).toBe('settings');
    expect(text('many')).toBe('2 sessions today');
    expect(document.documentElement.lang).toBe('en');
  });
});

describe('locales', () => {
  it('carry the same keys', () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
  });

  it.each(['fr', 'en'] as const)('leave no message empty in %s', (lang) => {
    const empty = Object.entries(LOCALES[lang])
      .filter(([, value]) => value.trim().length === 0)
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });
});
