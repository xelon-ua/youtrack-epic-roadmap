import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IssueNodeCard } from '../../src/ui/IssueNode';
import { BUCKET_STYLES } from '../../src/ui/statusBucket';
import type { RoadmapNode } from '../../src/graph/model';

const node: RoadmapNode = {
  id: 'WMS-987',
  summary: 'Phase 1: multi-db core',
  kind: 'epic',
  resolved: false,
  state: { name: 'In Progress', background: '#ffd700', foreground: '#000000' },
  assignee: 'Ann',
  project: 'WMS',
  parentId: 'ACME-102',
  url: 'https://x/issue/WMS-987',
};

afterEach(() => vi.restoreAllMocks());

describe('IssueNodeCard', () => {
  it('shows id, summary and state, and opens the issue on click', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<IssueNodeCard node={node} highlighted={false} critical={false} scheme="semantic" theme="light" />);
    expect(screen.getByText('WMS-987')).toBeInTheDocument();
    expect(screen.getByText('Phase 1: multi-db core')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(open).toHaveBeenCalledWith('https://x/issue/WMS-987', '_blank', 'noopener');
  });

  it('dims resolved issues and labels external ones', () => {
    render(
      <IssueNodeCard node={{ ...node, resolved: true, kind: 'external-dependent' }} highlighted={false} critical={false} scheme="semantic" theme="light" />,
    );
    expect(screen.getByRole('button')).toHaveClass('opacity-70');
    expect(screen.getByText('outside epic ↗')).toBeInTheDocument();
  });

  it('fills the card and the accent stripe from the status bucket', () => {
    render(<IssueNodeCard node={node} highlighted={false} critical={false} scheme="semantic" theme="light" />);
    const { background, accent } = BUCKET_STYLES.light['in-progress'];
    expect(screen.getByRole('button')).toHaveStyle({ background });
    expect(screen.getByTestId('status-stripe')).toHaveStyle({ background: accent });
  });

  it('takes its fill from the dark palette in the dark theme', () => {
    render(<IssueNodeCard node={node} highlighted={false} critical={false} scheme="semantic" theme="dark" />);
    const { background, accent } = BUCKET_STYLES.dark['in-progress'];
    expect(screen.getByRole('button')).toHaveStyle({ background });
    expect(screen.getByTestId('status-stripe')).toHaveStyle({ background: accent });
  });

  it('outlines a card on the critical path, next to and not instead of the hover ring', () => {
    const { rerender } = render(
      <IssueNodeCard node={node} highlighted={false} critical={false} scheme="semantic" theme="light" />,
    );
    expect(screen.getByRole('button')).not.toHaveClass('outline-amber-500');

    rerender(<IssueNodeCard node={node} highlighted critical scheme="semantic" theme="light" />);
    expect(screen.getByRole('button')).toHaveClass('outline-amber-500');
    expect(screen.getByRole('button')).toHaveClass('ring-blue-400');
  });

  it('uses the YouTrack state colour in the youtrack scheme', () => {
    render(<IssueNodeCard node={node} highlighted={false} critical={false} scheme="youtrack" theme="light" />);
    expect(screen.getByTestId('status-stripe')).toHaveStyle({ background: '#ffd700' });
    expect(screen.getByRole('button')).not.toHaveStyle({ background: BUCKET_STYLES.light['in-progress'].background });
  });
});
