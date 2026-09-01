import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createYouTrackClient, normalizeBaseUrl, ISSUE_FIELDS } from '../../src/api/youtrack';
import { AuthError, IssueNotFoundError, NetworkError, YouTrackHttpError } from '../../src/api/errors';

const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
const fail = (status: number) => new Response('{"error":"x"}', { status });

describe('normalizeBaseUrl', () => {
  it('adds https and strips trailing slashes and whitespace', () => {
    expect(normalizeBaseUrl(' wwind.youtrack.cloud/ ')).toBe('https://wwind.youtrack.cloud');
    expect(normalizeBaseUrl('https://x.example.com/youtrack//')).toBe('https://x.example.com/youtrack');
    expect(normalizeBaseUrl('http://localhost:8080')).toBe('http://localhost:8080');
  });
});

describe('createYouTrackClient', () => {
  const client = createYouTrackClient({ baseUrl: 'https://x.youtrack.cloud', token: 'perm-abc' });

  it('fetches an issue with the fields query and bearer token', async () => {
    fetchMock.mockResolvedValueOnce(
      ok({ idReadable: 'WMS-1', summary: 's', resolved: null, project: { shortName: 'WMS' }, customFields: [], links: [] }),
    );
    const dto = await client.fetchIssue('WMS-1');
    expect(dto.idReadable).toBe('WMS-1');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://x.youtrack.cloud/api/issues/WMS-1?fields=${encodeURIComponent(ISSUE_FIELDS)}`);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer perm-abc');
    expect((init.headers as Record<string, string>).Accept).toBe('application/json');
  });

  it('maps 401/403 to AuthError', async () => {
    fetchMock.mockResolvedValueOnce(fail(401));
    await expect(client.fetchIssue('WMS-1')).rejects.toBeInstanceOf(AuthError);
    fetchMock.mockResolvedValueOnce(fail(403));
    await expect(client.fetchMe()).rejects.toBeInstanceOf(AuthError);
  });

  it('maps 404 on an issue to IssueNotFoundError carrying the id', async () => {
    fetchMock.mockResolvedValueOnce(fail(404));
    await expect(client.fetchIssue('WMS-404')).rejects.toMatchObject({ name: 'IssueNotFoundError', issueId: 'WMS-404' });
    expect(new IssueNotFoundError('X-1')).toBeInstanceOf(YouTrackHttpError);
  });

  it('maps other statuses to YouTrackHttpError', async () => {
    fetchMock.mockResolvedValueOnce(fail(500));
    await expect(client.fetchIssue('WMS-1')).rejects.toMatchObject({ name: 'YouTrackHttpError', status: 500 });
  });

  it('wraps a thrown fetch (CORS/offline) into NetworkError', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(client.fetchIssue('WMS-1')).rejects.toBeInstanceOf(NetworkError);
  });

  it('passes the abort signal through and fetches /users/me', async () => {
    fetchMock.mockResolvedValueOnce(ok({ login: 'ann', fullName: 'Ann' }));
    const controller = new AbortController();
    const me = await client.fetchMe(controller.signal);
    expect(me.login).toBe('ann');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://x.youtrack.cloud/api/users/me?fields=login%2CfullName');
    expect(init.signal).toBe(controller.signal);
  });
});
