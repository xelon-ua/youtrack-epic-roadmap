import { AuthError, IssueNotFoundError, NetworkError, YouTrackHttpError } from '../api/errors';
import { NotAuthenticatedError } from '../store/roadmapStore';

export interface ErrorText {
  title: string;
  hint?: string;
  action?: 'sign-in' | 'settings';
}

export function describeError(err: Error): ErrorText {
  if (err instanceof NotAuthenticatedError) {
    return { title: 'Not signed in', hint: err.message, action: 'sign-in' };
  }
  if (err instanceof AuthError) {
    return { title: 'YouTrack rejected the token — please sign in again', action: 'sign-in' };
  }
  if (err instanceof IssueNotFoundError) {
    return { title: `Issue ${err.issueId} not found`, hint: 'Check the id, or you may lack permission to view it.' };
  }
  if (err instanceof NetworkError) {
    return {
      title: 'Could not reach YouTrack',
      hint:
        `The browser blocked the request. A YouTrack admin must add this origin (${window.location.origin}) ` +
        'under Administration → Global Settings → Resource Sharing → Allowed origins. See docs/setup-youtrack.md. ' +
        'Also check the YouTrack URL in Settings.',
      action: 'settings',
    };
  }
  if (err instanceof YouTrackHttpError) {
    return { title: `YouTrack error (HTTP ${err.status})`, hint: err.message };
  }
  return { title: err.message || 'Unexpected error' };
}
