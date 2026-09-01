import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Legend } from '../../src/ui/Legend';
import { useSettingsStore } from '../../src/store/settingsStore';
import { DEFAULT_SETTINGS } from '../../src/auth/storage';
import { BUCKET_ORDER, BUCKET_STYLES } from '../../src/ui/statusBucket';

beforeEach(() => {
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS } });
});

describe('Legend', () => {
  it('always explains the node kinds', () => {
    render(<Legend />);
    expect(screen.getByText('Epic (root)')).toBeInTheDocument();
    expect(screen.getByText('Prerequisite outside the epic')).toBeInTheDocument();
  });

  it('lists every status bucket in the semantic scheme', () => {
    render(<Legend />);
    for (const bucket of BUCKET_ORDER) {
      expect(screen.getByText(BUCKET_STYLES[bucket].label)).toBeInTheDocument();
    }
  });

  it('defers to YouTrack in the youtrack scheme', () => {
    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, colorScheme: 'youtrack' } });
    render(<Legend />);
    expect(screen.getByText(/YouTrack state colour/i)).toBeInTheDocument();
    expect(screen.queryByText(BUCKET_STYLES['in-progress'].label)).not.toBeInTheDocument();
  });
});
