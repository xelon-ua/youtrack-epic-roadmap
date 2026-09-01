import { create } from 'zustand';
import { clearToken, loadToken, saveToken, type StoredToken } from '../auth/storage';
import { useSettingsStore } from './settingsStore';

export interface AuthUser {
  login: string;
  fullName: string;
}

interface AuthState {
  token: StoredToken | null;
  user: AuthUser | null;
  setToken(token: StoredToken | null): void;
  setUser(user: AuthUser | null): void;
  signOut(): void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  token: loadToken(),
  user: null,
  setToken(token) {
    if (token) saveToken(token);
    else clearToken();
    set({ token });
  },
  setUser(user) {
    set({ user });
  },
  signOut() {
    clearToken();
    set({ token: null, user: null });
  },
}));

function validOAuthToken(): StoredToken | null {
  const token = useAuthStore.getState().token;
  return token && token.expiresAt > Date.now() ? token : null;
}

export function getAccessToken(): string | null {
  const permanent = useSettingsStore.getState().settings.permanentToken.trim();
  if (permanent) return permanent;
  return validOAuthToken()?.accessToken ?? null;
}

export function authMode(): 'permanent-token' | 'oauth' | 'none' {
  if (useSettingsStore.getState().settings.permanentToken.trim()) return 'permanent-token';
  return validOAuthToken() ? 'oauth' : 'none';
}
