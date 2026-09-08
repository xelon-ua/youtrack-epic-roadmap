import { rememberIssue } from '../store/recentIssues';

/** `semantic`: our own status palette. `youtrack`: the colours configured on the states. */
export type ColorScheme = 'semantic' | 'youtrack';

const COLOR_SCHEMES: ColorScheme[] = ['semantic', 'youtrack'];

/** `system` follows the OS setting; the other two pin the theme for this browser. */
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_PREFERENCES: ThemePreference[] = ['system', 'light', 'dark'];

/** An issue offered by the input's history: its id, plus the summary learnt when it was built. */
export interface RecentIssue {
  id: string;
  summary: string;
}

export interface Settings {
  baseUrl: string;
  clientId: string;
  permanentToken: string;
  colorScheme: ColorScheme;
  theme: ThemePreference;
  /** Outline the longest chain of issues leading to the root epic. */
  criticalPath: boolean;
  /** Issues built before, newest first: the input's history. */
  recentIssues: RecentIssue[];
  /** Keep resolved issues on the map. */
  showResolved: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  baseUrl: '',
  clientId: '',
  permanentToken: '',
  colorScheme: 'semantic',
  theme: 'system',
  criticalPath: false,
  recentIssues: [],
  showResolved: true,
};

export interface StoredToken {
  accessToken: string;
  /** Epoch milliseconds. */
  expiresAt: number;
}

const SETTINGS_KEY = 'yer.settings';
const TOKEN_KEY = 'yer.oauthToken';
const STATE_KEY = 'yer.oauthState';

function read<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(storage: Storage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable (private mode, quota); the app still works for this session.
  }
}

/** Storage is hand-editable and outlives releases: keep only well-formed, unique entries. */
function sanitizeRecentIssues(value: unknown): RecentIssue[] {
  if (!Array.isArray(value)) return [];
  const wellFormed = value.filter(
    (i): i is RecentIssue =>
      typeof i === 'object' &&
      i !== null &&
      typeof (i as RecentIssue).id === 'string' &&
      typeof (i as RecentIssue).summary === 'string',
  );
  // Oldest last: fold from the end so rememberIssue rebuilds the stored order, deduplicated.
  return wellFormed.reduceRight<RecentIssue[]>((list, issue) => rememberIssue(list, issue), []);
}

export function loadSettings(): Settings {
  const stored = read<Partial<Settings>>(localStorage, SETTINGS_KEY);
  const settings = { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
  // Storage is hand-editable and outlives releases; an unknown value must not reach the renderer.
  if (!COLOR_SCHEMES.includes(settings.colorScheme)) settings.colorScheme = DEFAULT_SETTINGS.colorScheme;
  if (!THEME_PREFERENCES.includes(settings.theme)) settings.theme = DEFAULT_SETTINGS.theme;
  if (typeof settings.criticalPath !== 'boolean') settings.criticalPath = DEFAULT_SETTINGS.criticalPath;
  settings.recentIssues = sanitizeRecentIssues(settings.recentIssues);
  // Releases before the history remembered a single id; carry it over so it is not lost.
  const legacyId = (stored as { lastIssueId?: unknown } | null)?.lastIssueId;
  if (settings.recentIssues.length === 0 && typeof legacyId === 'string' && legacyId !== '') {
    settings.recentIssues = [{ id: legacyId, summary: '' }];
  }
  if (typeof settings.showResolved !== 'boolean') settings.showResolved = DEFAULT_SETTINGS.showResolved;
  return settings;
}

export function saveSettings(settings: Settings): void {
  write(localStorage, SETTINGS_KEY, settings);
}

export function loadToken(): StoredToken | null {
  const t = read<StoredToken>(sessionStorage, TOKEN_KEY);
  return t && typeof t.accessToken === 'string' && typeof t.expiresAt === 'number' ? t : null;
}

export function saveToken(token: StoredToken): void {
  write(sessionStorage, TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function loadPendingState(): string | null {
  return read<string>(sessionStorage, STATE_KEY);
}

export function savePendingState(state: string): void {
  write(sessionStorage, STATE_KEY, state);
}

export function clearPendingState(): void {
  sessionStorage.removeItem(STATE_KEY);
}
