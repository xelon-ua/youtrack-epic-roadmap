export class YouTrackHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'YouTrackHttpError';
    this.status = status;
  }
}

export class AuthError extends YouTrackHttpError {
  constructor(status: number) {
    super(status, `YouTrack rejected the token (HTTP ${status})`);
    this.name = 'AuthError';
  }
}

export class IssueNotFoundError extends YouTrackHttpError {
  readonly issueId: string;

  constructor(issueId: string) {
    super(404, `Issue ${issueId} not found or not accessible`);
    this.name = 'IssueNotFoundError';
    this.issueId = issueId;
  }
}

/** fetch() itself threw: CORS block, DNS failure, offline. */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Network request failed (blocked by CORS or offline)', { cause });
    this.name = 'NetworkError';
  }
}
