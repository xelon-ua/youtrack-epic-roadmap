import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IssueNodeCard } from '../../src/ui/IssueNode';
import { useRoadmapStore } from '../../src/store/roadmapStore';
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

const initialRoadmapState = useRoadmapStore.getState();

afterEach(() => {
  vi.restoreAllMocks();
  useRoadmapStore.setState(initialRoadmapState, true);
});

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

  describe('context menu', () => {
    const openMenu = (card = node) => {
      window.history.replaceState(null, '', '/youtrack-epic-roadmap/?issue=ACME-1');
      render(<IssueNodeCard node={card} highlighted={false} critical={false} scheme="semantic" theme="light" />);
      fireEvent.contextMenu(screen.getByRole('button'));
    };

    it('offers to open the issue, build its graph here or in a new window', () => {
      openMenu();
      expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
        'Open in YouTrack',
        'Build graph for this issue',
        'Build graph in new window',
      ]);
    });

    it('opens the issue in YouTrack, like a click', () => {
      const open = vi.spyOn(window, 'open').mockImplementation(() => null);
      openMenu();
      fireEvent.click(screen.getByRole('menuitem', { name: 'Open in YouTrack' }));
      expect(open).toHaveBeenCalledWith('https://x/issue/WMS-987', '_blank', 'noopener');
    });

    it('builds the graph here and keeps the previous one in history', () => {
      const build = vi.fn(async () => {});
      useRoadmapStore.setState({ build });
      openMenu();
      const before = window.history.length;
      fireEvent.click(screen.getByRole('menuitem', { name: 'Build graph for this issue' }));
      expect(build).toHaveBeenCalledWith('WMS-987');
      expect(window.location.search).toBe('?issue=WMS-987');
      expect(window.history.length).toBe(before + 1);
    });

    it('builds the graph in a new window that keeps the session', () => {
      const open = vi.spyOn(window, 'open').mockImplementation(() => null);
      openMenu();
      fireEvent.click(screen.getByRole('menuitem', { name: 'Build graph in new window' }));
      const [url, target, features] = open.mock.calls[0];
      expect(String(url)).toBe(`${window.location.origin}/youtrack-epic-roadmap/?issue=WMS-987`);
      expect(target).toBe('_blank');
      // `noopener` would start the new tab without a copy of the sessionStorage token.
      expect(features).toBeUndefined();
    });

    it('does not offer to rebuild the graph that is already shown', () => {
      openMenu({ ...node, kind: 'root' });
      expect(screen.getByRole('menuitem', { name: 'Build graph for this issue' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      expect(screen.getByRole('menuitem', { name: 'Build graph in new window' })).not.toHaveAttribute(
        'aria-disabled',
      );
    });
  });
});
