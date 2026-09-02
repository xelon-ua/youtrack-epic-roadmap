import { describe, it, expect } from 'vitest';
import { hubUrl, createState, parseState, buildAuthUrl, parseAuthFragment } from '../../src/auth/oauth';

describe('hubUrl', () => {
  it('appends /hub for YouTrack Cloud', () => {
    expect(hubUrl('https://wwind.youtrack.cloud/')).toBe('https://wwind.youtrack.cloud/hub');
  });
  it('replaces a trailing /youtrack context path with /hub', () => {
    expect(hubUrl('https://yt.example.com/youtrack')).toBe('https://yt.example.com/hub');
  });
});

describe('state', () => {
  it('round-trips the issue id and carries a random nonce', () => {
    const a = createState('ACME-102');
    const b = createState('ACME-102');
    expect(a).not.toBe(b);
    expect(parseState(a)).toMatchObject({ issueId: 'ACME-102' });
    expect(parseState(a)!.nonce).toHaveLength(32);
    expect(parseState(createState(null))!.issueId).toBeNull();
  });
  it('returns null for garbage', () => {
    expect(parseState('not-base64!!')).toBeNull();
    expect(parseState('')).toBeNull();
  });
});

describe('buildAuthUrl', () => {
  it('builds the Hub implicit-flow URL', () => {
    const url = new URL(
      buildAuthUrl({
        baseUrl: 'https://x.youtrack.cloud',
        clientId: 'client-1',
        redirectUri: 'https://xelon-ua.github.io/youtrack-epic-roadmap/',
        state: 'st',
      }),
    );
    expect(url.origin + url.pathname).toBe('https://x.youtrack.cloud/hub/api/rest/oauth2/auth');
    expect(url.searchParams.get('response_type')).toBe('token');
    expect(url.searchParams.get('client_id')).toBe('client-1');
    expect(url.searchParams.get('scope')).toBe('YouTrack');
    expect(url.searchParams.get('redirect_uri')).toBe('https://xelon-ua.github.io/youtrack-epic-roadmap/');
    expect(url.searchParams.get('state')).toBe('st');
    expect(url.searchParams.get('request_credentials')).toBe('default');
  });
  it('uses request_credentials=silent for silent refresh', () => {
    const url = new URL(
      buildAuthUrl({ baseUrl: 'https://x', clientId: 'c', redirectUri: 'https://r/', state: 's', silent: true }),
    );
    expect(url.searchParams.get('request_credentials')).toBe('silent');
  });
});

describe('parseAuthFragment', () => {
  it('parses a successful response', () => {
    expect(
      parseAuthFragment('#access_token=abc.def&token_type=Bearer&expires_in=3600&scope=YouTrack&state=st'),
    ).toEqual({ accessToken: 'abc.def', expiresIn: 3600, state: 'st' });
  });
  it('parses an error response', () => {
    expect(parseAuthFragment('#error=login_required&error_description=x&state=st')).toEqual({
      error: 'login_required',
      state: 'st',
    });
  });
  it('returns null when the hash is unrelated or empty', () => {
    expect(parseAuthFragment('')).toBeNull();
    expect(parseAuthFragment('#section')).toBeNull();
  });
});
