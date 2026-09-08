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
      criticalPath: true,
      recentIssues: [{ id: 'WMS-42', summary: 'An epic' }],
      showResolved: false,
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
  it('defaults the critical path switch to off and rejects non-booleans', () => {
    expect(DEFAULT_SETTINGS.criticalPath).toBe(false);
    localStorage.setItem('yer.settings', JSON.stringify({ criticalPath: 'yes' }));
    expect(loadSettings().criticalPath).toBe(false);
  });
  it('defaults the recent issues to an empty list and rejects a non-list', () => {
    expect(DEFAULT_SETTINGS.recentIssues).toEqual([]);
    localStorage.setItem('yer.settings', JSON.stringify({ recentIssues: 'WMS-42' }));
    expect(loadSettings().recentIssues).toEqual([]);
  });
  it('drops recent issues that are not an id with a summary', () => {
    localStorage.setItem(
      'yer.settings',
      JSON.stringify({
        recentIssues: [
          { id: 'WMS-1', summary: 'Kept' },
          { id: 'WMS-2' },
          { id: 42, summary: 'Numeric id' },
          'WMS-3',
          null,
        ],
      }),
    );
    expect(loadSettings().recentIssues).toEqual([{ id: 'WMS-1', summary: 'Kept' }]);
  });
  it('drops duplicate recent issues and trims the list to ten', () => {
    const stored = [
      { id: 'WMS-1', summary: 'First' },
      { id: 'WMS-1', summary: 'Same id again' },
      ...Array.from({ length: 12 }, (_, i) => ({ id: `WMS-${i + 2}`, summary: `Issue ${i + 2}` })),
    ];
    localStorage.setItem('yer.settings', JSON.stringify({ recentIssues: stored }));
    const loaded = loadSettings().recentIssues;
    expect(loaded).toHaveLength(10);
    expect(loaded.map((i) => i.id)).toEqual([
      'WMS-1', 'WMS-2', 'WMS-3', 'WMS-4', 'WMS-5', 'WMS-6', 'WMS-7', 'WMS-8', 'WMS-9', 'WMS-10',
    ]);
  });
  it('migrates the issue id remembered by an earlier release into the history', () => {
    localStorage.setItem('yer.settings', JSON.stringify({ lastIssueId: 'WMS-42' }));
    expect(loadSettings().recentIssues).toEqual([{ id: 'WMS-42', summary: '' }]);
  });
  it('ignores the migrated id once a history exists', () => {
    localStorage.setItem(
      'yer.settings',
      JSON.stringify({ lastIssueId: 'WMS-42', recentIssues: [{ id: 'WMS-1', summary: 'First' }] }),
    );
    expect(loadSettings().recentIssues).toEqual([{ id: 'WMS-1', summary: 'First' }]);
  });
  it('defaults show resolved to on and rejects non-booleans', () => {
    expect(DEFAULT_SETTINGS.showResolved).toBe(true);
    localStorage.setItem('yer.settings', JSON.stringify({ showResolved: 'yes' }));
    expect(loadSettings().showResolved).toBe(true);
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
