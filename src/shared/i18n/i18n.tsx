import { createContext, useContext, useLayoutEffect, useMemo, type ReactNode } from 'react';
import type {
  I18nContextValue,
  Locale,
  MessageKey,
  Messages,
  PluralMessageKey,
  TranslateParams,
} from '../../types';
import { useSettings } from '../settings/settings-provider';
import { interpolate } from './interpolate';
import { en } from './locales/en';
import { fr } from './locales/fr';

const DICTIONARIES: Record<Locale, Messages> = { fr, en };
const LOCALE_TAGS: Record<Locale, string> = { fr: 'fr-FR', en: 'en-GB' };

const I18nContext = createContext<I18nContextValue | null>(null);

type PluralFormKey = `${PluralMessageKey}_one` | `${PluralMessageKey}_other`;

// French keeps the singular for zero, English does not.
function pluralKey(lang: Locale, key: PluralMessageKey, count: number): PluralFormKey {
  const magnitude = Math.abs(count);
  const singular = lang === 'fr' ? magnitude < 2 : magnitude === 1;
  return singular ? `${key}_one` : `${key}_other`;
}

export function I18nProvider({ children }: { children: ReactNode }): JSX.Element {
  const { settings, setLang } = useSettings();
  const { lang } = settings;

  useLayoutEffect(() => {
    document.documentElement.lang = lang;
    const meta = document.querySelector('meta[name="description"]');
    meta?.setAttribute('content', DICTIONARIES[lang]['app.description']);
  }, [lang]);

  const value = useMemo<I18nContextValue>(() => {
    const messages = DICTIONARIES[lang];
    return {
      lang,
      setLang,
      t: (key: MessageKey, params?: TranslateParams) => interpolate(messages[key], params),
      tn: (key: PluralMessageKey, count: number, params?: TranslateParams) =>
        interpolate(messages[pluralKey(lang, key, count)], { count, ...params }),
      formatDate: (date: Date, options: Intl.DateTimeFormatOptions) =>
        new Intl.DateTimeFormat(LOCALE_TAGS[lang], options).format(date),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside an I18nProvider');
  return value;
}
