export type Phase = 'idle' | 'running' | 'paused' | 'finished';
export type Mode = 'focus' | 'break';
export type Layout = 'portrait' | 'landscape' | 'tablet' | 'desktop';
export type Locale = 'fr' | 'en';
/** The theme actually painted. `ThemeChoice` is what the user picked. */
export type Theme = 'light' | 'dark';
export type ThemeChoice = Theme | 'system';
export type AccentKey = 'red' | 'green' | 'blue' | 'custom';
export type PresetAccentKey = Exclude<AccentKey, 'custom'>;

export interface Settings {
  theme: ThemeChoice;
  accentKey: AccentKey;
  customColor: string;
  lang: Locale;
  chime: boolean;
  focusMinutes: number;
  breakMinutes: number;
  dailyGoal: number;
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
  isFuture: boolean;
}

export interface MonthStats {
  cells: MonthCell[];
  activeDays: number;
  total: number;
}

/** What one day amounts to, for the line under the charts. */
export interface DayDetail {
  date: string;
  count: number;
  minutes: number;
}

export interface AccentPalette {
  light: string;
  dark: string;
}

export interface SettingsContextValue {
  settings: Settings;
  /** `settings.theme` resolved: never `system`. */
  theme: Theme;
  accentHex: string;
  setTheme(theme: ThemeChoice): void;
  setAccentKey(key: AccentKey): void;
  setCustomColor(hex: string): void;
  setLang(lang: Locale): void;
  setChime(enabled: boolean): void;
  setFocusMinutes(minutes: number): void;
  setBreakMinutes(minutes: number): void;
  setDailyGoal(sessions: number): void;
}

export interface Suggestion {
  mode: Mode;
  minutes: number;
}

/** The length armed for each mode when the app proposes the next one. */
export type SessionDurations = Record<Mode, number>;

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
  | 'stats.today'
  | 'stats.week.footer'
  | 'stats.month.total'
  | 'stats.month.footer'
  | 'stats.day.count';

type PluralForms<K extends string> = { [P in `${K}_one` | `${K}_other`]: string };

interface SingularMessages {
  'app.name': string;
  'app.description': string;

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
  'timer.shortcuts.paused': string;

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
  'stats.goal.reached': string;
  'stats.week.caption': string;
  'stats.notice': string;
  'stats.session.done': string;
  'stats.session.todo': string;
  'stats.day.none': string;
  'stats.day.today': string;
  'stats.duration.minutes': string;
  'stats.duration.hours': string;
  'stats.duration.hoursMinutes': string;

  'stats.day.mon': string;
  'stats.day.tue': string;
  'stats.day.wed': string;
  'stats.day.thu': string;
  'stats.day.fri': string;
  'stats.day.sat': string;
  'stats.day.sun': string;

  'settings.title': string;
  'settings.appearance': string;
  'settings.theme.system': string;
  'settings.theme.light': string;
  'settings.theme.dark': string;
  'settings.theme.systemHint': string;
  'settings.accent.title': string;
  'settings.accent.red': string;
  'settings.accent.green': string;
  'settings.accent.blue': string;
  'settings.accent.custom': string;
  'settings.accent.customHint': string;
  'settings.accent.contrastWarning': string;
  'settings.durations.title': string;
  'settings.durations.focus': string;
  'settings.durations.break': string;
  'settings.durations.hint': string;
  'settings.durations.minutes': string;
  'settings.goal.title': string;
  'settings.goal.label': string;
  'settings.goal.hint': string;
  'settings.stepper.less': string;
  'settings.stepper.more': string;
  'settings.language.title': string;
  'settings.language.fr': string;
  'settings.language.en': string;
  'settings.sound.title': string;
  'settings.sound.chime': string;
  'settings.sound.hint': string;
  'settings.install.title': string;
  'settings.install.hint': string;
  'settings.install.action': string;
  'settings.update.title': string;
  'settings.update.hint': string;
  'settings.method': string;
  'settings.about': string;
  'settings.legal': string;
  'settings.version': string;

  'intro.lead': string;
  'intro.what.title': string;
  'intro.what.body': string;
  'intro.quiet.title': string;
  'intro.quiet.body': string;
  'intro.local.title': string;
  'intro.local.body': string;
  'intro.start': string;
  'intro.method': string;

  'about.title': string;
  'about.lead': string;
  'about.body1': string;
  'about.body2': string;

  'method.title': string;
  'method.lead': string;
  'method.origin.title': string;
  'method.origin.body': string;
  'method.attention.title': string;
  'method.attention.body': string;
  'method.breaks.title': string;
  'method.breaks.body': string;
  'method.numbers.title': string;
  'method.numbers.body': string;
  'method.references.title': string;
  'method.references.hint': string;

  'legal.title': string;
  'legal.publisher.title': string;
  'legal.publisher.body': string;
  'legal.data.title': string;
  'legal.data.body': string;
  'legal.licences.title': string;
  'legal.licences.body': string;

  'update.ready': string;
  'update.reload': string;
  'update.later': string;
  'update.check': string;
  'update.checking': string;
  'update.upToDate': string;

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
export const INTRO_STORAGE_KEY = 'pomodoro.intro.v1';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  accentKey: 'red',
  customColor: '#8B5CF6',
  lang: 'fr',
  chime: true,
  focusMinutes: 25,
  breakMinutes: 5,
  dailyGoal: 4,
};

export const ACCENT_PALETTE: Record<PresetAccentKey, AccentPalette> = {
  red: { light: '#D63E45', dark: '#FF6F6F' },
  green: { light: '#2C855E', dark: '#5FCB92' },
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
