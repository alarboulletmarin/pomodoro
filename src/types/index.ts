export type Phase = 'idle' | 'running' | 'paused' | 'finished';
export type Mode = 'focus' | 'break';
export type Layout = 'portrait' | 'landscape' | 'tablet' | 'desktop';
export type Locale = 'fr' | 'en';
export type Theme = 'light' | 'dark';
export type AccentKey = 'red' | 'green' | 'blue' | 'custom';
export type PresetAccentKey = Exclude<AccentKey, 'custom'>;

export interface Settings {
  theme: Theme;
  accentKey: AccentKey;
  customColor: string;
  lang: Locale;
  chime: boolean;
}

export interface SessionEntry {
  startedAt: number;
  minutes: number;
  mode: Mode;
}

export interface SessionStore {
  version: 1;
  entries: SessionEntry[];
}

export interface TimerState {
  phase: Phase;
  mode: Mode;
  minutes: number;
  endsAt: number | null;
  remainingMs: number;
}

export type TimerEvent =
  | { type: 'setMinutes'; minutes: number }
  | { type: 'setMode'; mode: Mode; minutes: number }
  | { type: 'start'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'sync'; now: number }
  | { type: 'end' };

export interface DayStat {
  date: string;
  count: number;
  isToday: boolean;
}

export interface WeekStats {
  days: DayStat[];
  max: number;
  total: number;
}

export type HeatLevel = 0 | 1 | 2 | 3;

export interface MonthCell {
  date: string;
  count: number;
  level: HeatLevel;
}

export interface MonthStats {
  cells: MonthCell[];
  activeDays: number;
  total: number;
}

export interface AccentPalette {
  light: string;
  dark: string;
}

export interface SettingsContextValue {
  settings: Settings;
  accentHex: string;
  setTheme(theme: Theme): void;
  setAccentKey(key: AccentKey): void;
  setCustomColor(hex: string): void;
  setLang(lang: Locale): void;
  setChime(enabled: boolean): void;
}

export interface Suggestion {
  mode: Mode;
  minutes: number;
}

export interface TimerContextValue {
  state: TimerState;
  remainingMs: number;
  progressRatio: number;
  todayCount: number;
  sessions: SessionEntry[];
  suggestion: Suggestion | null;
  setMinutes(minutes: number): void;
  start(): void;
  pause(): void;
  resume(): void;
  end(): void;
  acceptSuggestion(): void;
  dismissSuggestion(): void;
}

export type TranslateParams = Record<string, string | number>;

export type PluralMessageKey =
  'stats.today' | 'stats.week.footer' | 'stats.month.total' | 'stats.day.count';

type PluralForms<K extends string> = { [P in `${K}_one` | `${K}_other`]: string };

interface SingularMessages {
  'app.name': string;

  'timer.mode.focus': string;
  'timer.mode.break': string;

  'timer.heading.idle.focus': string;
  'timer.heading.idle.break': string;
  'timer.heading.running.focus': string;
  'timer.heading.running.break': string;
  'timer.heading.paused': string;
  'timer.heading.finished.focus': string;
  'timer.heading.finished.break': string;

  'timer.subhead.idle.focus': string;
  'timer.subhead.idle.break': string;
  'timer.subhead.running': string;
  'timer.subhead.paused': string;
  'timer.subhead.finished.focus': string;
  'timer.subhead.finished.break': string;

  'timer.preset': string;
  'timer.scrubHint': string;
  'timer.scrubber.label': string;
  'timer.shortcuts.idle': string;
  'timer.shortcuts.active': string;

  'timer.action.start': string;
  'timer.action.startBreak': string;
  'timer.action.pause': string;
  'timer.action.resume': string;
  'timer.action.nextBreak': string;
  'timer.action.nextFocus': string;
  'timer.action.end': string;
  'timer.action.doneForToday': string;

  'timer.announce.finished.focus': string;
  'timer.announce.finished.break': string;
  'timer.announce.paused': string;
  'timer.announce.resumed': string;

  'stats.goal': string;
  'stats.week.caption': string;
  'stats.month.footer': string;
  'stats.session.done': string;
  'stats.session.todo': string;
  'stats.day.none': string;

  'stats.day.mon': string;
  'stats.day.tue': string;
  'stats.day.wed': string;
  'stats.day.thu': string;
  'stats.day.fri': string;
  'stats.day.sat': string;
  'stats.day.sun': string;

  'settings.title': string;
  'settings.back': string;
  'settings.appearance': string;
  'settings.theme.light': string;
  'settings.theme.dark': string;
  'settings.accent.title': string;
  'settings.accent.red': string;
  'settings.accent.green': string;
  'settings.accent.blue': string;
  'settings.accent.custom': string;
  'settings.accent.customHint': string;
  'settings.accent.contrastWarning': string;
  'settings.language.title': string;
  'settings.language.fr': string;
  'settings.language.en': string;
  'settings.sound.title': string;
  'settings.sound.chime': string;
  'settings.sound.hint': string;
  'settings.install.title': string;
  'settings.install.hint': string;
  'settings.install.action': string;
  'settings.about': string;
  'settings.legal': string;
  'settings.version': string;

  'about.title': string;
  'about.lead': string;
  'about.body1': string;
  'about.body2': string;

  'legal.title': string;
  'legal.publisher.title': string;
  'legal.publisher.body': string;
  'legal.data.title': string;
  'legal.data.body': string;
  'legal.licences.title': string;
  'legal.licences.body': string;

  'a11y.openSettings': string;
  'a11y.back': string;
}

export type Messages = SingularMessages & PluralForms<PluralMessageKey>;
export type MessageKey = keyof Messages;

export interface I18nContextValue {
  lang: Locale;
  setLang(lang: Locale): void;
  t(key: MessageKey, params?: TranslateParams): string;
  tn(key: PluralMessageKey, count: number, params?: TranslateParams): string;
  formatDate(date: Date, options: Intl.DateTimeFormatOptions): string;
}

export const SETTINGS_STORAGE_KEY = 'pomodoro.settings.v1';
export const SESSIONS_STORAGE_KEY = 'pomodoro.sessions.v1';
export const TIMER_STORAGE_KEY = 'pomodoro.timer.v1';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  accentKey: 'red',
  customColor: '#7A4BD0',
  lang: 'fr',
  chime: true,
};

export const ACCENT_PALETTE: Record<PresetAccentKey, AccentPalette> = {
  red: { light: '#F0464E', dark: '#FF6F6F' },
  green: { light: '#2E8B62', dark: '#5FCB92' },
  blue: { light: '#2F6FE0', dark: '#7FA9FF' },
};

export const ON_ACCENT: Record<Theme, string> = {
  light: '#FFFFFF',
  dark: '#1A1310',
};

export const LAYOUT_BREAKPOINTS = {
  landscapeMaxHeight: 430,
  tabletMinWidth: 768,
  desktopMinWidth: 1200,
} as const;
