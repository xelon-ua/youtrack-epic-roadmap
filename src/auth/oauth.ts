import { normalizeBaseUrl } from '../api/youtrack';

export function hubUrl(baseUrl: string): string {
  const base = normalizeBaseUrl(baseUrl);
  return /\/youtrack$/i.test(base) ? base.replace(/\/youtrack$/i, '/hub') : `${base}/hub`;
}

export interface AuthState {
  nonce: string;
  issueId: string | null;
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const toBase64Url = (s: string): string =>
  btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64Url = (s: string): string => atob(s.replace(/-/g, '+').replace(/_/g, '/'));

export function createState(issueId: string | null): string {
  const state: AuthState = { nonce: randomNonce(), issueId };
  return toBase64Url(JSON.stringify(state));
}

export function parseState(raw: string): AuthState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(raw)) as Partial<AuthState>;
    if (typeof parsed.nonce !== 'string') return null;
    return { nonce: parsed.nonce, issueId: typeof parsed.issueId === 'string' ? parsed.issueId : null };
  } catch {
    return null;
  }
}

export function buildAuthUrl(p: {
  baseUrl: string;
  clientId: string;
  redirectUri: string;
  state: string;
  silent?: boolean;
}): string {
  const url = new URL(`${hubUrl(p.baseUrl)}/api/rest/oauth2/auth`);
  url.searchParams.set('response_type', 'token');
  url.searchParams.set('client_id', p.clientId);
  url.searchParams.set('scope', 'YouTrack');
  url.searchParams.set('redirect_uri', p.redirectUri);
  url.searchParams.set('state', p.state);
  url.searchParams.set('request_credentials', p.silent ? 'silent' : 'default');
  return url.toString();
}

export type AuthFragment =
  | { accessToken: string; expiresIn: number; state: string }
  | { error: string; state: string | null };

export function parseAuthFragment(hash: string): AuthFragment | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const error = params.get('error');
  if (error) return { error, state: params.get('state') };
  const accessToken = params.get('access_token');
  if (!accessToken) return null;
  return {
    accessToken,
    expiresIn: Number(params.get('expires_in') ?? '0'),
    state: params.get('state') ?? '',
  };
}
