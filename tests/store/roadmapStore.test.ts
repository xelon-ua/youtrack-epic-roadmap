import { describe, it, expect, beforeEach, vi } from 'vitest';

// vi.mock is hoisted above imports, so the fixture must be created inside the factory
// (a module-level const would be in its temporal dead zone when the factory runs).
vi.mock('../../src/api/youtrack', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/youtrack')>();
  const { createFixtureFetch } = await import('../fixtures/epic');
  const fixture = createFixtureFetch();
  return {
    ...actual,
    createYouTrackClient: () => ({
      fetchIssue: fixture.fetchIssue,
      fetchMe: async () => ({ login: 'a', fullName: 'A' }),
    }),
  };
});

import { useRoadmapStore, NotAuthenticatedError } from '../../src/store/roadmapStore';
import { useSettingsStore } from '../../src/store/settingsStore';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useSettingsStore.getState().update({ baseUrl: 'https://x', clientId: '', permanentToken: '' });
  useRoadmapStore.setState({ status: 'idle', roadmap: null, error: null, progress: 0, issueId: '' });
});

describe('roadmapStore', () => {
  it('fails with NotAuthenticatedError when there is no token', async () => {
    await useRoadmapStore.getState().build('EP-1');
    const s = useRoadmapStore.getState();
    expect(s.status).toBe('error');
    expect(s.error).toBeInstanceOf(NotAuthenticatedError);
  });

  it('builds a roadmap and tracks progress', async () => {
    useSettingsStore.getState().update({ permanentToken: 'perm' });
    await useRoadmapStore.getState().build('EP-1');
    const s = useRoadmapStore.getState();
    expect(s.status).toBe('ready');
    expect(s.issueId).toBe('EP-1');
    expect(s.roadmap?.nodes.size).toBeGreaterThan(5);
    expect(s.progress).toBe(s.roadmap?.nodes.size);
  });

  it('records errors from the collector', async () => {
    useSettingsStore.getState().update({ permanentToken: 'perm' });
    await useRoadmapStore.getState().build('NOPE-1');
    expect(useRoadmapStore.getState().status).toBe('error');
    expect(useRoadmapStore.getState().error?.name).toBe('IssueNotFoundError');
  });

  it('toggles showResolved', () => {
    useRoadmapStore.getState().setShowResolved(false);
    expect(useRoadmapStore.getState().showResolved).toBe(false);
  });
});
