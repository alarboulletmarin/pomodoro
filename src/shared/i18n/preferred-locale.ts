import type { Locale } from '../../types';

/**
 * The language to open on when nothing has been stored yet — a link shared with a
 * stranger lands on a language they read. French only when the browser asks for it;
 * English otherwise, as the wider fallback.
 */
export function preferredLocale(tags: readonly string[] = navigatorLanguages()): Locale {
  return tags.some((tag) => typeof tag === 'string' && tag.toLowerCase().startsWith('fr'))
    ? 'fr'
    : 'en';
}

function navigatorLanguages(): readonly string[] {
  const { languages, language } = globalThis.navigator ?? {};
  if (languages && languages.length > 0) return languages;
  return language ? [language] : [];
}
