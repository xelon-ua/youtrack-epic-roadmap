import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import { THEME_PREFERENCES, type ThemePreference } from '../auth/storage';
import { useSettingsStore } from '../store/settingsStore';

/** The theme actually rendered, once the `system` preference has been resolved. */
export type Theme = 'light' | 'dark';

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): Theme {
  return preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;
}

/** Order of the toolbar toggle: system → light → dark → system. */
export function nextThemePreference(preference: ThemePreference): ThemePreference {
  const index = THEME_PREFERENCES.indexOf(preference);
  return THEME_PREFERENCES[(index + 1) % THEME_PREFERENCES.length];
}

/**
 * Tailwind's dark variant follows the `dark` class (see the custom variant in index.css), and
 * `color-scheme` makes scrollbars and native form controls follow along.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

// matchMedia is missing in jsdom and in very old browsers; light is the safe answer there.
function darkQuery(): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null;
}

function subscribeToSystemTheme(onChange: () => void): () => void {
  const query = darkQuery();
  if (!query) return () => {};
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function systemPrefersDark(): boolean {
  return darkQuery()?.matches ?? false;
}

/**
 * The resolved theme for the stored preference, applied to the document. While the preference is
 * `system` it tracks the OS setting live, so the app flips without a reload.
 */
export function useResolvedTheme(): Theme {
  const preference = useSettingsStore((s) => s.settings.theme);
  const prefersDark = useSyncExternalStore(subscribeToSystemTheme, systemPrefersDark);
  const theme = resolveTheme(preference, prefersDark);
  useEffect(() => applyTheme(theme), [theme]);
  return theme;
}

export const ThemeContext = createContext<Theme>('light');

/** The theme currently rendered. Light outside a provider, which is what plain HTML would give. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}
