import { describe, expect, it } from 'vitest';
import { preferredLocale } from './preferred-locale';

describe('preferredLocale', () => {
  it('answers French to a browser that asks for it, in any region', () => {
    expect(preferredLocale(['fr'])).toBe('fr');
    expect(preferredLocale(['fr-FR'])).toBe('fr');
    expect(preferredLocale(['FR-ca'])).toBe('fr');
  });

  it('answers French when it comes second, ahead of a language we do not have', () => {
    expect(preferredLocale(['es-ES', 'fr-FR', 'en'])).toBe('fr');
  });

  it('falls back to English rather than to the author’s language', () => {
    expect(preferredLocale(['en-GB'])).toBe('en');
    expect(preferredLocale(['de', 'nl'])).toBe('en');
    expect(preferredLocale([])).toBe('en');
  });
});
