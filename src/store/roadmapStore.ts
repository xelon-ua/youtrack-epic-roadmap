import { create } from 'zustand';
import { collectRoadmap } from '../graph/collect';
import type { Roadmap } from '../graph/model';
import { createYouTrackClient } from '../api/youtrack';
import { getAccessToken } from './authStore';
import { useSettingsStore } from './settingsStore';

export class NotAuthenticatedError extends Error {
  constructor() {
    super('Sign in with YouTrack or paste a permanent token in Settings');
    this.name = 'NotAuthenticatedError';
  }
}

export type RoadmapStatus = 'idle' | 'loading' | 'ready' | 'error';

interface RoadmapState {
  issueId: string;
  status: RoadmapStatus;
  roadmap: Roadmap | null;
  error: Error | null;
  progress: number;
  setIssueId(id: string): void;
  build(issueId: string): Promise<void>;
  cancel(): void;
}

let controller: AbortController | null = null;

export const useRoadmapStore = create<RoadmapState>()((set) => ({
  issueId: '',
  status: 'idle',
  roadmap: null,
  error: null,
  progress: 0,
  setIssueId(issueId) {
    set({ issueId });
  },
  async build(rawId) {
    const issueId = rawId.trim().toUpperCase();
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    set({ issueId, status: 'loading', error: null, progress: 0, roadmap: null });
    // Remembered as soon as it is asked for: the input should come back even if the build fails.
    useSettingsStore.getState().update({ lastIssueId: issueId });

    const token = getAccessToken();
    if (!token) {
      set({ status: 'error', error: new NotAuthenticatedError() });
      return;
    }
    const baseUrl = useSettingsStore.getState().settings.baseUrl;
    const client = createYouTrackClient({ baseUrl, token });
    try {
      const roadmap = await collectRoadmap(issueId, client.fetchIssue, {
        baseUrl,
        signal,
        onProgress: (n) => set({ progress: n }),
      });
      if (!signal.aborted) set({ status: 'ready', roadmap });
    } catch (err) {
      if (signal.aborted) return;
      set({ status: 'error', error: err instanceof Error ? err : new Error(String(err)) });
    }
  },
  cancel() {
    controller?.abort();
    controller = null;
    set({ status: 'idle', progress: 0 });
  },
}));
