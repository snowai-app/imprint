/* Imprint opens light whatever the device's setting; dark only by choice
   (operator, 3 October 2026, T-2120). The choice lives in one cookie, read
   by the root layout so the server renders the right data-theme. */
export const THEME_COOKIE = 'imprint-theme';
export type Theme = 'light' | 'dark';
export function themeFrom(value: string | undefined): Theme {
  return value === 'dark' ? 'dark' : 'light';
}
