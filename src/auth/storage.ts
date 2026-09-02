/** `semantic`: our own status palette. `youtrack`: the colours configured on the states. */
export type ColorScheme = 'semantic' | 'youtrack';

const COLOR_SCHEMES: ColorScheme[] = ['semantic', 'youtrack'];

/** `system` follows the OS setting; the other two pin the theme for this browser. */
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_PREFERENCES: ThemePreference[] = ['system', 'light', 'dark'];

export interface Settings {
  baseUrl: string;
  clientId: string;
  permanentToken: string;
  colorScheme: ColorScheme;
  theme: ThemePreference;
  /** Outline the longest chain of issues leading to the root epic. */
  criticalPath: boolean;
  /** The issue last built, offered as the input's initial value on the next visit. */
  lastIssueId: string;
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
  lastIssueId: '',
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

export function loadSettings(): Settings {
  const stored = read<Partial<Settings>>(localStorage, SETTINGS_KEY);
  const settings = { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
  // Storage is hand-editable and outlives releases; an unknown value must not reach the renderer.
  if (!COLOR_SCHEMES.includes(settings.colorScheme)) settings.colorScheme = DEFAULT_SETTINGS.colorScheme;
  if (!THEME_PREFERENCES.includes(settings.theme)) settings.theme = DEFAULT_SETTINGS.theme;
  if (typeof settings.criticalPath !== 'boolean') settings.criticalPath = DEFAULT_SETTINGS.criticalPath;
  if (typeof settings.lastIssueId !== 'string') settings.lastIssueId = DEFAULT_SETTINGS.lastIssueId;
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
