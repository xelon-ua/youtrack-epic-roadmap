/** The app keeps the issue whose graph is shown in `?issue=`, so a graph can be linked and reloaded. */

export function issueFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('issue');
}

/** The address of the app showing `issueId`'s graph; an empty id leaves the parameter out. */
export function graphUrl(issueId: string): URL {
  const url = new URL(window.location.href);
  if (issueId) url.searchParams.set('issue', issueId);
  else url.searchParams.delete('issue');
  return url;
}

/** Records the shown issue in place: the browser history does not grow. */
export function writeIssueToUrl(issueId: string): void {
  window.history.replaceState(null, '', graphUrl(issueId));
}

/** Records the shown issue as a new history entry, so Back returns to the previous graph. */
export function pushIssueToUrl(issueId: string): void {
  window.history.pushState(null, '', graphUrl(issueId));
}
