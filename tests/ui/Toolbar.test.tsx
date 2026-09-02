import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from '../../src/ui/Toolbar';
import { useRoadmapStore } from '../../src/store/roadmapStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { DEFAULT_SETTINGS } from '../../src/auth/storage';
import { useCriticalPathStore } from '../../src/store/criticalPathStore';
import type { Roadmap, RoadmapNode } from '../../src/graph/model';

beforeEach(() => {
  localStorage.clear();
  useRoadmapStore.setState({ issueId: '', status: 'idle', roadmap: null, error: null, progress: 0 });
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS } });
  useCriticalPathStore.setState({ ids: new Set() });
});

const node = (id: string, resolved = false): RoadmapNode => ({
  id,
  summary: id,
  kind: 'epic',
  resolved,
  state: null,
  assignee: null,
  project: 'EP',
  parentId: null,
  url: `https://x/issue/${id}`,
});

const roadmapOf = (...nodes: RoadmapNode[]): Roadmap => ({
  rootId: nodes[0].id,
  nodes: new Map(nodes.map((n) => [n.id, n])),
  edges: [],
  orphanIds: [],
  cycles: [],
  truncated: false,
});

describe('Toolbar', () => {
  it('builds the typed issue id on submit', () => {
    const build = vi.fn().mockResolvedValue(undefined);
    useRoadmapStore.setState({ build });
    render(<Toolbar onOpenSettings={() => {}} onFitView={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText('ACME-102'), { target: { value: 'wms-1' } });
    fireEvent.submit(screen.getByRole('form'));
    expect(build).toHaveBeenCalledWith('wms-1');
  });

  it('prefills the input with the remembered issue id', () => {
    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, lastIssueId: 'WMS-42' } });
    render(<Toolbar onOpenSettings={() => {}} onFitView={() => {}} />);
    expect(screen.getByLabelText('Issue ID')).toHaveValue('WMS-42');
  });

  it('prefers the issue id already in the store over the remembered one', () => {
    useRoadmapStore.setState({ issueId: 'WMS-1' });
    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, lastIssueId: 'WMS-42' } });
    render(<Toolbar onOpenSettings={() => {}} onFitView={() => {}} />);
    expect(screen.getByLabelText('Issue ID')).toHaveValue('WMS-1');
  });

  it('toggles show resolved and persists it', () => {
    render(<Toolbar onOpenSettings={() => {}} onFitView={() => {}} />);
    fireEvent.click(screen.getByRole('switch', { name: /show resolved/i }));
    expect(useSettingsStore.getState().settings.showResolved).toBe(false);
    expect(JSON.parse(localStorage.getItem('yer.settings')!).showResolved).toBe(false);
  });

  it('toggles the critical path and persists it', () => {
    render(<Toolbar onOpenSettings={() => {}} onFitView={() => {}} />);
    fireEvent.click(screen.getByRole('switch', { name: /critical path/i }));
    expect(useSettingsStore.getState().settings.criticalPath).toBe(true);
    expect(JSON.parse(localStorage.getItem('yer.settings')!).criticalPath).toBe(true);
  });

  it('counts the issues on the critical path only while it is shown', () => {
    useRoadmapStore.setState({ roadmap: roadmapOf(node('EP-1'), node('EP-2'), node('EP-3', true)) });
    useCriticalPathStore.setState({ ids: new Set(['EP-1', 'EP-2']) });
    const { rerender } = render(<Toolbar onOpenSettings={() => {}} onFitView={() => {}} />);
    expect(screen.queryByText(/on critical path/i)).not.toBeInTheDocument();

    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, criticalPath: true } });
    rerender(<Toolbar onOpenSettings={() => {}} onFitView={() => {}} />);
    expect(screen.getByText(/2 on critical path/i)).toBeInTheDocument();
  });

  it('cycles the theme preference and persists it', () => {
    render(<Toolbar onOpenSettings={() => {}} onFitView={() => {}} />);
    const button = screen.getByRole('button', { name: /theme: system/i });
    fireEvent.click(button);
    expect(useSettingsStore.getState().settings.theme).toBe('light');
    expect(JSON.parse(localStorage.getItem('yer.settings')!).theme).toBe('light');
    fireEvent.click(screen.getByRole('button', { name: /theme: light/i }));
    expect(useSettingsStore.getState().settings.theme).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: /theme: dark/i }));
    expect(useSettingsStore.getState().settings.theme).toBe('system');
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
