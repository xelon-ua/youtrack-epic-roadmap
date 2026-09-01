import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from '../../src/ui/Toolbar';
import { useRoadmapStore } from '../../src/store/roadmapStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { DEFAULT_SETTINGS } from '../../src/auth/storage';

beforeEach(() => {
  useRoadmapStore.setState({ issueId: '', status: 'idle', roadmap: null, error: null, progress: 0, showResolved: true });
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS } });
});

describe('Toolbar', () => {
  it('builds the typed issue id on submit', () => {
    const build = vi.fn().mockResolvedValue(undefined);
    useRoadmapStore.setState({ build });
    render(<Toolbar onOpenSettings={() => {}} onFitView={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText('WMS-985'), { target: { value: 'wms-1' } });
    fireEvent.submit(screen.getByRole('form'));
    expect(build).toHaveBeenCalledWith('wms-1');
  });

  it('toggles show resolved', () => {
    render(<Toolbar onOpenSettings={() => {}} onFitView={() => {}} />);
    fireEvent.click(screen.getByRole('switch', { name: /show resolved/i }));
    expect(useRoadmapStore.getState().showResolved).toBe(false);
  });

  it('switches the colour scheme and persists it', () => {
    render(<Toolbar onOpenSettings={() => {}} onFitView={() => {}} />);
    const select = screen.getByLabelText('Colours');
    expect(select).toHaveValue('semantic');
    fireEvent.change(select, { target: { value: 'youtrack' } });
    expect(useSettingsStore.getState().settings.colorScheme).toBe('youtrack');
    expect(JSON.parse(localStorage.getItem('yer.settings')!).colorScheme).toBe('youtrack');
  });
});
