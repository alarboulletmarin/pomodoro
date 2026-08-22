import type { CSSProperties } from 'react';
import type { Theme } from '../../types';

// The token file exposes light values on :root only, so a miniature of the theme
// that is *not* current — and any contrast check against both — needs them here.
export const THEME_BG: Record<Theme, string> = { light: '#FBF6EE', dark: '#151311' };
export const THEME_INK: Record<Theme, string> = { light: '#221E1A', dark: '#F5F0E8' };

export type StyleVars = CSSProperties & Record<`--${string}`, string>;
