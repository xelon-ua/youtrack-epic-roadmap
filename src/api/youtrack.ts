import type { IssueDto, MeDto } from './types';
import { AuthError, IssueNotFoundError, NetworkError, YouTrackHttpError } from './errors';
import type { FetchIssue } from '../graph/collect';

export const ISSUE_FIELDS =
  'idReadable,summary,resolved,project(shortName),' +
  'customFields(name,value(name,color(background,foreground))),' +
  'links(direction,linkType(name),issues(idReadable))';

export function normalizeBaseUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/\/+$/, '');
}

export interface YouTrackClient {
  fetchIssue: FetchIssue;
  fetchMe(signal?: AbortSignal): Promise<MeDto>;
}

export function createYouTrackClient(cfg: { baseUrl: string; token: string }): YouTrackClient {
  const baseUrl = normalizeBaseUrl(cfg.baseUrl);

  async function request<T>(path: string, signal: AbortSignal | undefined, notFound: () => Error): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${cfg.token}`, Accept: 'application/json' },
        signal,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      throw new NetworkError(err);
    }
    if (response.status === 401 || response.status === 403) throw new AuthError(response.status);
    if (response.status === 404) throw notFound();
    if (!response.ok) {
      throw new YouTrackHttpError(response.status, `YouTrack responded with HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  }

  return {
    fetchIssue: (id, signal) =>
      request<IssueDto>(
        `/api/issues/${encodeURIComponent(id)}?fields=${encodeURIComponent(ISSUE_FIELDS)}`,
        signal,
        () => new IssueNotFoundError(id),
      ),
    fetchMe: (signal) =>
      request<MeDto>(
        `/api/users/me?fields=${encodeURIComponent('login,fullName')}`,
        signal,
        () => new YouTrackHttpError(404, 'Current user endpoint not found'),
      ),
  };
}
