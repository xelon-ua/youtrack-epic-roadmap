import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CanvasMessage } from '../../src/ui/CanvasMessage';
import { useRoadmapStore } from '../../src/store/roadmapStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { DEFAULT_SETTINGS } from '../../src/auth/storage';
import { IssueNotFoundError } from '../../src/api/errors';

const initialRoadmapState = useRoadmapStore.getState();

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useRoadmapStore.setState(initialRoadmapState, true);
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS } });
});

const currentStep = (): string | null | undefined =>
  document.querySelector('[aria-current="step"]')?.textContent;

describe('CanvasMessage', () => {
  it('starts a new user at connecting, with Settings one click away', () => {
    const onOpenSettings = vi.fn();
    render(<CanvasMessage onOpenSettings={onOpenSettings} />);
    expect(screen.getByText('YouTrack Epic Roadmap')).toBeInTheDocument();
    expect(currentStep()).toMatch(/Connect to your YouTrack/);
    fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }));
    expect(onOpenSettings).toHaveBeenCalled();
  });

  it('asks to sign in once the URL is set', () => {
    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, baseUrl: 'https://yt', clientId: 'c' } });
    render(<CanvasMessage onOpenSettings={() => {}} />);
    expect(currentStep()).toMatch(/Sign in/);
    expect(screen.getByRole('button', { name: 'Sign in with YouTrack' })).toBeInTheDocument();
  });

  it('points at the id field once signed in', () => {
    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, baseUrl: 'https://yt', permanentToken: 'perm-x' } });
    render(<CanvasMessage onOpenSettings={() => {}} />);
    expect(currentStep()).toMatch(/Enter an epic id/);
  });

  it('shows the build progress with a way to cancel it', () => {
    const cancel = vi.fn();
    useRoadmapStore.setState({ status: 'loading', issueId: 'WMS-1', progress: 12, cancel });
    render(<CanvasMessage onOpenSettings={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('Fetched 12 issues');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancel).toHaveBeenCalled();
  });

  it('explains a failed build', () => {
    useRoadmapStore.setState({ status: 'error', error: new IssueNotFoundError('WMS-404') });
    render(<CanvasMessage onOpenSettings={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Issue WMS-404 not found');
  });
});
