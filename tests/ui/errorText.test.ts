import { describe, it, expect } from 'vitest';
import { describeError } from '../../src/ui/errorText';
import { AuthError, IssueNotFoundError, NetworkError, YouTrackHttpError } from '../../src/api/errors';
import { NotAuthenticatedError } from '../../src/store/roadmapStore';

describe('describeError', () => {
  it('maps known errors to user text', () => {
    expect(describeError(new NotAuthenticatedError())).toMatchObject({ action: 'sign-in' });
    expect(describeError(new AuthError(401))).toMatchObject({
      title: expect.stringMatching(/sign in/i),
      action: 'sign-in',
    });
    expect(describeError(new IssueNotFoundError('WMS-9'))).toMatchObject({ title: 'Issue WMS-9 not found' });
    expect(describeError(new NetworkError(new TypeError('x')))).toMatchObject({
      hint: expect.stringMatching(/Resource Sharing/),
      action: 'settings',
    });
    expect(describeError(new YouTrackHttpError(500, 'boom'))).toMatchObject({ title: 'YouTrack error (HTTP 500)' });
    expect(describeError(new Error('weird'))).toMatchObject({ title: 'weird' });
  });
});
