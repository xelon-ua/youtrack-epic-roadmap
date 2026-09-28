import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { Legend } from '../../src/ui/Legend';
import { useSettingsStore } from '../../src/store/settingsStore';
import { DEFAULT_SETTINGS } from '../../src/auth/storage';
import { BUCKET_LABELS, BUCKET_ORDER } from '../../src/ui/statusBucket';

beforeEach(() => {
  // Opened: most of these tests read the panel.
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, legendOpen: true } });
});

describe('Legend', () => {
  it('always explains the node kinds', () => {
    render(<Legend />);
    expect(screen.getByText('Epic (root)')).toBeInTheDocument();
    expect(screen.getByText('Prerequisite outside the epic')).toBeInTheDocument();
  });

  it('explains both arrow styles', () => {
    render(<Legend />);
    expect(screen.getByText(/prerequisite → dependent/i)).toBeInTheDocument();
    expect(screen.getByText(/subtask → parent/i)).toBeInTheDocument();
  });

  it('lists every status bucket in the semantic scheme', () => {
    render(<Legend />);
    for (const bucket of BUCKET_ORDER) {
      expect(screen.getByText(BUCKET_LABELS[bucket])).toBeInTheDocument();
    }
  });

  it('explains the critical path outline only while it is shown', () => {
    render(<Legend />);
    expect(screen.queryByText(/critical path/i)).not.toBeInTheDocument();

    act(() => useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, legendOpen: true, criticalPath: true } }));
    expect(screen.getByText(/critical path/i)).toBeInTheDocument();
  });

  it('defers to YouTrack in the youtrack scheme', () => {
    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, legendOpen: true, colorScheme: 'youtrack' } });
    render(<Legend />);
    expect(screen.getByText(/YouTrack state colour/i)).toBeInTheDocument();
    expect(screen.queryByText(BUCKET_LABELS['in-progress'])).not.toBeInTheDocument();
  });

  it('starts folded for a new user, so it covers no card', () => {
    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS } });
    render(<Legend />);
    expect(screen.getByRole('button', { name: 'Legend' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Epic (root)')).not.toBeInTheDocument();
  });

  it('folds into its button and remembers it', () => {
    render(<Legend />);
    const toggle = screen.getByRole('button', { name: 'Legend' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Epic (root)')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('yer.settings')!).legendOpen).toBe(false);
  });
});
