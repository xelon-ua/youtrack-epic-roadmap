import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from '../src/App';
import { useRoadmapStore } from '../src/store/roadmapStore';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useRoadmapStore.setState({ issueId: '', status: 'idle', roadmap: null, error: null, progress: 0, showResolved: true });
});

describe('App', () => {
  it('renders the empty state', () => {
    window.history.replaceState(null, '', '/youtrack-epic-roadmap/');
    render(<App />);
    expect(screen.getByText('YouTrack Epic Roadmap')).toBeInTheDocument();
  });

  it('picks the issue id from the URL', () => {
    window.history.replaceState(null, '', '/youtrack-epic-roadmap/?issue=WMS-42');
    render(<App />);
    expect(useRoadmapStore.getState().issueId).toBe('WMS-42');
    expect(screen.getByLabelText('Issue ID')).toHaveValue('WMS-42');
  });
});
