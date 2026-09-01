import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from '../../src/ui/Toolbar';
import { useRoadmapStore } from '../../src/store/roadmapStore';

beforeEach(() => {
  useRoadmapStore.setState({ issueId: '', status: 'idle', roadmap: null, error: null, progress: 0, showResolved: true });
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
});
