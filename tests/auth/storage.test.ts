import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  loadToken,
  saveToken,
  clearToken,
  loadPendingState,
  savePendingState,
  clearPendingState,
} from '../../src/auth/storage';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('settings', () => {
  it('returns defaults when nothing stored or stored value is corrupt', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    localStorage.setItem('yer.settings', '{not json');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
  it('round-trips and fills missing keys with defaults', () => {
    const settings = {
      baseUrl: 'https://x',
      clientId: 'c',
      permanentToken: '',
      colorScheme: 'youtrack' as const,
      theme: 'dark' as const,
    };
    saveSettings(settings);
    expect(loadSettings()).toEqual(settings);
    localStorage.setItem('yer.settings', JSON.stringify({ baseUrl: 'https://y' }));
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, baseUrl: 'https://y' });
  });
  it('defaults the colour scheme to semantic and rejects unknown values', () => {
    expect(DEFAULT_SETTINGS.colorScheme).toBe('semantic');
    localStorage.setItem('yer.settings', JSON.stringify({ colorScheme: 'rainbow' }));
    expect(loadSettings().colorScheme).toBe('semantic');
  });
  it('defaults the theme to system and rejects unknown values', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('system');
    localStorage.setItem('yer.settings', JSON.stringify({ theme: 'sepia' }));
    expect(loadSettings().theme).toBe('system');
  });
});

describe('token', () => {
  it('round-trips through sessionStorage and clears', () => {
    expect(loadToken()).toBeNull();
    saveToken({ accessToken: 't', expiresAt: 123 });
    expect(loadToken()).toEqual({ accessToken: 't', expiresAt: 123 });
    expect(localStorage.getItem('yer.oauthToken')).toBeNull();
    clearToken();
    expect(loadToken()).toBeNull();
  });
});

describe('pending state', () => {
  it('round-trips and clears', () => {
    expect(loadPendingState()).toBeNull();
    savePendingState('abc');
    expect(loadPendingState()).toBe('abc');
    clearPendingState();
    expect(loadPendingState()).toBeNull();
  });
});
