import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from '../src/App';
import { useRoadmapStore } from '../src/store/roadmapStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { DEFAULT_SETTINGS } from '../src/auth/storage';
import { setPrefersDark } from './matchMedia';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS } });
  useRoadmapStore.setState({ issueId: '', status: 'idle', roadmap: null, error: null, progress: 0 });
});

describe('App', () => {
  it('renders the empty state', () => {
    window.history.replaceState(null, '', '/youtrack-epic-roadmap/');
    render(<App />);
    expect(screen.getByText('YouTrack Epic Roadmap')).toBeInTheDocument();
  });

  it('paints the theme chosen in the toolbar onto the document', () => {
    window.history.replaceState(null, '', '/youtrack-epic-roadmap/');
    render(<App />);
    expect(document.documentElement).not.toHaveClass('dark');
    fireEvent.click(screen.getByRole('button', { name: /theme: system/i }));
    fireEvent.click(screen.getByRole('button', { name: /theme: light/i }));
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('follows the system theme until the user picks one', () => {
    window.history.replaceState(null, '', '/youtrack-epic-roadmap/');
    render(<App />);
    act(() => setPrefersDark(true));
    expect(document.documentElement).toHaveClass('dark');
    fireEvent.click(screen.getByRole('button', { name: /theme: system/i }));
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('offers the remembered issue id without building it', () => {
    window.history.replaceState(null, '', '/youtrack-epic-roadmap/');
    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, lastIssueId: 'WMS-42' } });
    render(<App />);
    expect(screen.getByLabelText('Issue ID')).toHaveValue('WMS-42');
    expect(useRoadmapStore.getState().issueId).toBe('');
    expect(useRoadmapStore.getState().status).toBe('idle');
    expect(window.location.search).toBe('');
  });

  it('picks the issue id from the URL', () => {
    window.history.replaceState(null, '', '/youtrack-epic-roadmap/?issue=WMS-42');
    render(<App />);
    expect(useRoadmapStore.getState().issueId).toBe('WMS-42');
    expect(screen.getByLabelText('Issue ID')).toHaveValue('WMS-42');
  });
});
