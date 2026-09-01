import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { handleOAuthCallback, startLogin, redirectUri } from '../../src/auth/session';
import { createState } from '../../src/auth/oauth';
import { savePendingState, loadPendingState, loadToken } from '../../src/auth/storage';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useAuthStore } from '../../src/store/authStore';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useAuthStore.getState().signOut();
  useSettingsStore.getState().update({ baseUrl: 'https://x.youtrack.cloud', clientId: 'cid', permanentToken: '' });
  window.history.replaceState(null, '', '/youtrack-epic-roadmap/?issue=WMS-1');
});
afterEach(() => vi.restoreAllMocks());

describe('handleOAuthCallback', () => {
  it('stores the token, strips the hash and returns the issue id from state', () => {
    const state = createState('WMS-985');
    savePendingState(state);
    window.location.hash = `#access_token=tok&token_type=Bearer&expires_in=3600&state=${state}`;
    const result = handleOAuthCallback();
    expect(result).toEqual({ issueId: 'WMS-985' });
    expect(loadToken()?.accessToken).toBe('tok');
    expect(loadToken()!.expiresAt).toBeGreaterThan(Date.now() + 3_500_000);
    expect(window.location.hash).toBe('');
    expect(loadPendingState()).toBeNull();
  });

  it('rejects a state mismatch (CSRF) without storing a token', () => {
    savePendingState(createState(null));
    window.location.hash = `#access_token=tok&expires_in=3600&state=${createState(null)}`;
    expect(handleOAuthCallback()).toBeNull();
    expect(loadToken()).toBeNull();
    expect(window.location.hash).toBe('');
  });

  it('returns null when there is no OAuth fragment', () => {
    expect(handleOAuthCallback()).toBeNull();
  });
});

describe('startLogin', () => {
  it('saves pending state and redirects to Hub', () => {
    const navigate = vi.fn();
    startLogin('WMS-2', navigate);
    expect(loadPendingState()).not.toBeNull();
    const url = new URL(navigate.mock.calls[0][0] as string);
    expect(url.pathname).toBe('/hub/api/rest/oauth2/auth');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('redirect_uri')).toBe(redirectUri());
  });
});
