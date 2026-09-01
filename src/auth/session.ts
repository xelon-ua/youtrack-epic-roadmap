import { buildAuthUrl, createState, parseAuthFragment, parseState } from './oauth';
import { clearPendingState, loadPendingState, savePendingState } from './storage';
import { silentRefresh } from './silentRefresh';
import { createYouTrackClient } from '../api/youtrack';
import { AuthError } from '../api/errors';
import { useAuthStore, authMode, getAccessToken } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';

const REFRESH_LEAD_MS = 60_000;

export function redirectUri(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`;
}

function authUrlFor(state: string, silent: boolean): string {
  const { baseUrl, clientId } = useSettingsStore.getState().settings;
  return buildAuthUrl({ baseUrl, clientId, redirectUri: redirectUri(), state, silent });
}

/** `navigate` is injectable so tests do not have to stub `window.location`. */
export function startLogin(
  issueId: string | null,
  navigate: (url: string) => void = (url) => window.location.assign(url),
): void {
  const state = createState(issueId);
  savePendingState(state);
  navigate(authUrlFor(state, false));
}

/**
 * Consume an OAuth fragment from the URL. Returns the issue id carried in state,
 * or null when nothing was consumed (no fragment, Hub error, or state mismatch).
 */
export function handleOAuthCallback(): { issueId: string | null } | null {
  const fragment = parseAuthFragment(window.location.hash);
  if (!fragment) return null;
  const pending = loadPendingState();
  clearPendingState();
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  if ('error' in fragment) return null;
  if (!pending || fragment.state !== pending) return null;
  useAuthStore.getState().setToken({
    accessToken: fragment.accessToken,
    expiresAt: Date.now() + fragment.expiresIn * 1000,
  });
  return { issueId: parseState(fragment.state)?.issueId ?? null };
}

export async function refreshSilently(): Promise<boolean> {
  const state = createState(null);
  try {
    const hash = await silentRefresh(authUrlFor(state, true));
    const fragment = parseAuthFragment(hash);
    if (!fragment || 'error' in fragment || fragment.state !== state) return false;
    useAuthStore.getState().setToken({
      accessToken: fragment.accessToken,
      expiresAt: Date.now() + fragment.expiresIn * 1000,
    });
    return true;
  } catch {
    return false;
  }
}

/** Arms a timer that refreshes the OAuth token shortly before it expires. */
export function scheduleRefresh(): () => void {
  const token = useAuthStore.getState().token;
  if (!token || authMode() !== 'oauth') return () => {};
  const delay = Math.max(0, token.expiresAt - Date.now() - REFRESH_LEAD_MS);
  const timer = setTimeout(async () => {
    const ok = await refreshSilently();
    if (!ok) useAuthStore.getState().signOut();
  }, delay);
  return () => clearTimeout(timer);
}

export async function loadCurrentUser(): Promise<void> {
  const token = getAccessToken();
  if (!token) {
    useAuthStore.getState().setUser(null);
    return;
  }
  const { baseUrl } = useSettingsStore.getState().settings;
  try {
    const me = await createYouTrackClient({ baseUrl, token }).fetchMe();
    useAuthStore.getState().setUser({ login: me.login, fullName: me.fullName });
  } catch (err) {
    if (err instanceof AuthError) useAuthStore.getState().signOut();
    else useAuthStore.getState().setUser(null);
  }
}
