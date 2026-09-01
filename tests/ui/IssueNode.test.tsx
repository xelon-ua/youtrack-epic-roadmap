import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IssueNodeCard } from '../../src/ui/IssueNode';
import type { RoadmapNode } from '../../src/graph/model';

const node: RoadmapNode = {
  id: 'WMS-987',
  summary: 'Phase 1: multi-db core',
  kind: 'epic',
  resolved: false,
  state: { name: 'In Progress', background: '#ffd700', foreground: '#000000' },
  assignee: 'Ann',
  project: 'WMS',
  parentId: 'WMS-985',
  url: 'https://x/issue/WMS-987',
};

afterEach(() => vi.restoreAllMocks());

describe('IssueNodeCard', () => {
  it('shows id, summary and state, and opens the issue on click', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<IssueNodeCard node={node} highlighted={false} />);
    expect(screen.getByText('WMS-987')).toBeInTheDocument();
    expect(screen.getByText('Phase 1: multi-db core')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(open).toHaveBeenCalledWith('https://x/issue/WMS-987', '_blank', 'noopener');
  });

  it('dims resolved issues and labels external ones', () => {
    render(<IssueNodeCard node={{ ...node, resolved: true, kind: 'external-dependent' }} highlighted={false} />);
    expect(screen.getByRole('button')).toHaveClass('opacity-55');
    expect(screen.getByText('outside epic ↗')).toBeInTheDocument();
  });
});
