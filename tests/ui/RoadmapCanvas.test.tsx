import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Edge, Node } from '@xyflow/react';

/*
 * React Flow keeps a node's measured size only while the node object stays referentially
 * identical (`adoptUserNodes` compares `userNode === internals.userNode`). A node it has to
 * re-adopt loses `measured`, renders with `visibility: hidden` until a ResizeObserver
 * delivers a new measurement, and re-subscribes to the observer. Rebuilding every node on
 * hover therefore blanks the whole graph and floods the observer — which is exactly how
 * "ResizeObserver loop completed with undelivered notifications" showed up on a 60-node epic.
 * These tests pin the two properties that keep that from happening.
 */

interface Captured {
  nodes: Node[];
  edges: Edge[];
  onNodeMouseEnter?: (event: unknown, node: Node) => void;
  onNodeMouseLeave?: (event: unknown, node: Node) => void;
}
const captured: Captured = { nodes: [], edges: [] };

vi.mock('@xyflow/react', () => ({
  ReactFlow: (props: Captured & { children?: React.ReactNode }) => {
    captured.nodes = props.nodes;
    captured.edges = props.edges;
    captured.onNodeMouseEnter = props.onNodeMouseEnter;
    captured.onNodeMouseLeave = props.onNodeMouseLeave;
    return <div data-testid="react-flow">{props.children}</div>;
  },
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  Handle: () => null,
  Position: { Left: 'left', Right: 'right' },
  MarkerType: { ArrowClosed: 'arrowclosed' },
  useReactFlow: () => ({ fitView: vi.fn() }),
}));

const { RoadmapCanvas } = await import('../../src/ui/RoadmapCanvas');
const { collectRoadmap } = await import('../../src/graph/collect');
const { createFixtureFetch } = await import('../fixtures/epic');
const { NODE_HEIGHT, NODE_WIDTH } = await import('../../src/graph/layout');
const { useSettingsStore } = await import('../../src/store/settingsStore');
const { useCriticalPathStore } = await import('../../src/store/criticalPathStore');
const { DEFAULT_SETTINGS } = await import('../../src/auth/storage');
const { Roadmap } = await import('../../src/graph/model').then((m) => ({ Roadmap: m }));
void Roadmap;

type RoadmapValue = Awaited<ReturnType<typeof collectRoadmap>>;

let roadmap: RoadmapValue;

beforeEach(async () => {
  const { fetchIssue } = createFixtureFetch();
  roadmap = await collectRoadmap('EP-1', fetchIssue, { baseUrl: 'https://yt.example' });
  captured.nodes = [];
  captured.edges = [];
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS } });
  useCriticalPathStore.setState({ ids: new Set() });
});

const showCriticalPath = (on: boolean): void => {
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, criticalPath: on } });
};

const byId = (nodes: Node[]): Map<string, Node> => new Map(nodes.map((n) => [n.id, n]));

describe('RoadmapCanvas', () => {
  it('keeps node object identity when hovering, so React Flow never re-measures the graph', () => {
    render(<RoadmapCanvas roadmap={roadmap} showResolved />);
    const before = byId(captured.nodes);
    expect(before.size).toBeGreaterThan(3);

    act(() => captured.onNodeMouseEnter?.({}, { id: 'EP-4', type: 'issue' } as Node));

    const after = byId(captured.nodes);
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
    for (const [id, node] of after) {
      expect(node, `node ${id} was rebuilt on hover`).toBe(before.get(id));
    }
  });

  it('keeps node object identity when the hover leaves', () => {
    render(<RoadmapCanvas roadmap={roadmap} showResolved />);
    const before = byId(captured.nodes);
    act(() => captured.onNodeMouseEnter?.({}, { id: 'EP-4', type: 'issue' } as Node));
    act(() => captured.onNodeMouseLeave?.({}, { id: 'EP-4', type: 'issue' } as Node));

    for (const [id, node] of byId(captured.nodes)) {
      expect(node, `node ${id} was rebuilt on hover out`).toBe(before.get(id));
    }
  });

  it('draws implicit subtask edges dashed and explicit dependencies solid', () => {
    render(<RoadmapCanvas roadmap={roadmap} showResolved />);
    const byEdgeId = new Map(captured.edges.map((e) => [e.id, e]));

    const subtask = byEdgeId.get('EP-4>EP-2');
    expect(subtask, 'subtask edge EP-4 → EP-2 is missing').toBeDefined();
    expect(subtask!.style?.strokeDasharray).toBeTruthy();

    const depend = byEdgeId.get('EP-3>EP-4');
    expect(depend, 'dependency edge EP-3 → EP-4 is missing').toBeDefined();
    expect(depend!.style?.strokeDasharray).toBeUndefined();
  });

  it('highlights a hovered card together with its subtask edges', () => {
    render(<RoadmapCanvas roadmap={roadmap} showResolved />);
    const idle = captured.edges.find((e) => e.id === 'EP-4>EP-2')!.style?.stroke;
    act(() => captured.onNodeMouseEnter?.({}, { id: 'EP-2', type: 'issue' } as Node));
    expect(captured.edges.find((e) => e.id === 'EP-4>EP-2')!.style?.stroke).not.toBe(idle);
  });

  it('publishes the critical path only while the switch is on', () => {
    render(<RoadmapCanvas roadmap={roadmap} showResolved />);
    expect(useCriticalPathStore.getState().ids.size).toBe(0);

    act(() => showCriticalPath(true));
    // EXT-11 → EXT-10 → EP-2 → EP-5 → EP-1, tied with EP-3 → EP-4 → EP-2 → EP-5 → EP-1.
    expect([...useCriticalPathStore.getState().ids].sort()).toEqual([
      'EP-1',
      'EP-2',
      'EP-3',
      'EP-4',
      'EP-5',
      'EXT-10',
      'EXT-11',
    ]);

    act(() => showCriticalPath(false));
    expect(useCriticalPathStore.getState().ids.size).toBe(0);
  });

  it('colours the steps of the critical path apart from the rest', () => {
    render(<RoadmapCanvas roadmap={roadmap} showResolved />);
    const stroke = (id: string): string | undefined => captured.edges.find((e) => e.id === id)!.style?.stroke;
    const idle = stroke('EP-5>EP-1');

    act(() => showCriticalPath(true));
    expect(stroke('EP-5>EP-1')).not.toBe(idle); // a step of the path
    expect(stroke('EP-6>EP-1')).toBe(idle); // has slack
    expect(stroke('EP-3>EP-2')).toBe(idle); // joins two critical nodes but skips a rank
  });

  it('keeps node object identity when the critical path switch flips', () => {
    render(<RoadmapCanvas roadmap={roadmap} showResolved />);
    const before = byId(captured.nodes);
    act(() => showCriticalPath(true));
    for (const [id, node] of byId(captured.nodes)) {
      expect(node, `node ${id} was rebuilt by the critical path switch`).toBe(before.get(id));
    }
  });

  it('declares the fixed card size on issue nodes so they render before being measured', () => {
    render(<RoadmapCanvas roadmap={roadmap} showResolved />);
    const issues = captured.nodes.filter((n) => n.type === 'issue');
    expect(issues.length).toBeGreaterThan(0);
    for (const node of issues) {
      expect(node.width).toBe(NODE_WIDTH);
      expect(node.height).toBe(NODE_HEIGHT);
    }
  });
});
