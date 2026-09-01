import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore, getAccessToken, authMode } from '../../src/store/authStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { loadToken } from '../../src/auth/storage';

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  useAuthStore.getState().signOut();
  useSettingsStore.getState().update({ baseUrl: '', clientId: '', permanentToken: '' });
});

describe('authStore', () => {
  it('reports none when there is no token', () => {
    expect(getAccessToken()).toBeNull();
    expect(authMode()).toBe('none');
  });

  it('prefers a permanent token over OAuth', () => {
    useAuthStore.getState().setToken({ accessToken: 'oauth', expiresAt: Date.now() + 60_000 });
    useSettingsStore.getState().update({ permanentToken: 'perm-1' });
    expect(getAccessToken()).toBe('perm-1');
    expect(authMode()).toBe('permanent-token');
  });

  it('uses a non-expired OAuth token and persists it to sessionStorage', () => {
    useAuthStore.getState().setToken({ accessToken: 'oauth', expiresAt: Date.now() + 60_000 });
    expect(getAccessToken()).toBe('oauth');
    expect(authMode()).toBe('oauth');
    expect(loadToken()?.accessToken).toBe('oauth');
  });

  it('treats an expired OAuth token as absent and signOut clears storage', () => {
    useAuthStore.getState().setToken({ accessToken: 'old', expiresAt: Date.now() - 1 });
    expect(getAccessToken()).toBeNull();
    useAuthStore.getState().setUser({ login: 'a', fullName: 'A' });
    useAuthStore.getState().signOut();
    expect(useAuthStore.getState().user).toBeNull();
    expect(loadToken()).toBeNull();
  });
});
