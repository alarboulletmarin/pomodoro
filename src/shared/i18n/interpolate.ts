import type { TranslateParams } from '../../types';

const PLACEHOLDER = /\{(\w+)\}/g;

export function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(PLACEHOLDER, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}
