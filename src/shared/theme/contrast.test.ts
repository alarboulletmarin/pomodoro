import { describe, expect, it } from 'vitest';
import { ACCENT_PALETTE, ON_ACCENT } from '../../types';
import { bestOnColor, contrastRatio, normaliseHex, relativeLuminance } from './contrast';

describe('normaliseHex', () => {
  it('expands shorthand and uppercases', () => {
    expect(normaliseHex('#f0a')).toBe('#FF00AA');
    expect(normaliseHex('7a4bd0')).toBe('#7A4BD0');
    expect(normaliseHex('  #FbF6eE ')).toBe('#FBF6EE');
  });

  it('rejects anything that is not a hex colour', () => {
    expect(normaliseHex('')).toBeNull();
    expect(normaliseHex('red')).toBeNull();
    expect(normaliseHex('#12345')).toBeNull();
    expect(normaliseHex('rgb(0,0,0)')).toBeNull();
  });
});

describe('relativeLuminance', () => {
  it('anchors black at 0 and white at 1', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 10);
  });

  it('matches the WCAG reference value for mid grey', () => {
    expect(relativeLuminance('#808080')).toBeCloseTo(0.21586, 5);
  });

  it('throws on an unparseable colour', () => {
    expect(() => relativeLuminance('nope')).toThrow(TypeError);
  });
});

describe('contrastRatio', () => {
  it('returns 21 for black on white and 1 for identical colours', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 10);
    expect(contrastRatio('#F0464E', '#F0464E')).toBeCloseTo(1, 10);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#F0464E', '#FFFFFF')).toBeCloseTo(
      contrastRatio('#FFFFFF', '#F0464E'),
      10,
    );
  });

  it('keeps every preset accent readable under its on-accent colour', () => {
    for (const palette of Object.values(ACCENT_PALETTE)) {
      expect(contrastRatio(palette.light, ON_ACCENT.light)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(palette.dark, ON_ACCENT.dark)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('bestOnColor', () => {
  it('picks the dark ink on light accents', () => {
    expect(bestOnColor('#FFFFFF')).toBe(ON_ACCENT.dark);
    expect(bestOnColor('#FFD84D')).toBe(ON_ACCENT.dark);
    expect(bestOnColor(ACCENT_PALETTE.red.dark)).toBe(ON_ACCENT.dark);
  });

  it('picks white on dark accents', () => {
    expect(bestOnColor('#000000')).toBe(ON_ACCENT.light);
    expect(bestOnColor('#7A4BD0')).toBe(ON_ACCENT.light);
    expect(bestOnColor(ACCENT_PALETTE.blue.light)).toBe(ON_ACCENT.light);
  });

  it('always returns the higher-contrast of the two inks', () => {
    for (const hex of ['#F0464E', '#2E8B62', '#7A4BD0', '#5FCB92', '#123456', '#EEEEEE']) {
      const chosen = bestOnColor(hex);
      const other = chosen === ON_ACCENT.light ? ON_ACCENT.dark : ON_ACCENT.light;
      expect(contrastRatio(hex, chosen)).toBeGreaterThanOrEqual(contrastRatio(hex, other));
    }
  });
});
