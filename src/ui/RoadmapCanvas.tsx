import { useEffect, useMemo } from 'react';
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import type { Roadmap } from '../graph/model';
import { projectRoadmap } from '../graph/filter';
import { layoutRoadmap, NODE_HEIGHT, NODE_WIDTH } from '../graph/layout';
import { useHoverStore } from '../store/hoverStore';
import { IssueNode, type IssueFlowNode } from './IssueNode';
import { useTheme, type Theme } from './theme';

type LaneNode = Node<{ label: string }, 'lane'>;

function LaneLabel({ data }: NodeProps<LaneNode>) {
  return (
    <div className="select-none text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
      {data.label}
    </div>
  );
}

const nodeTypes: NodeTypes = { issue: IssueNode, lane: LaneLabel };

interface EdgeColors {
  idle: string;
  active: string;
  /* Hierarchy edges are inferred, not links the user drew, so they stay quieter. */
  subtask: string;
}

const EDGE_COLORS: Record<Theme, EdgeColors> = {
  light: { idle: '#9ca3af', active: '#2563eb', subtask: '#d1d5db' },
  dark: { idle: '#64748b', active: '#60a5fa', subtask: '#3f4a5f' },
};

const EDGE_SUBTASK_DASH = '6 4';

export function RoadmapCanvas({ roadmap, showResolved }: { roadmap: Roadmap; showResolved: boolean }) {
  const hoveredId = useHoverStore((s) => s.hoveredId);
  const theme = useTheme();
  const setHovered = useHoverStore((s) => s.setHovered);
  const { fitView } = useReactFlow();

  const projection = useMemo(() => projectRoadmap(roadmap, { showResolved }), [roadmap, showResolved]);

  /*
   * Node objects must survive hovering untouched: React Flow drops a node's measured size when it
   * has to re-adopt it, hides the card until a ResizeObserver measures it again, and re-subscribes
   * it to the observer. Rebuilding all of them on every mouse move blanks the graph and floods the
   * observer ("ResizeObserver loop completed with undelivered notifications"). Highlighting is read
   * from the hover store inside the cards instead, and the size is declared up front so a node never
   * has to wait for a measurement to become visible.
   */
  const nodes = useMemo(() => {
    const layout = layoutRoadmap(projection);
    const issueNodes: IssueFlowNode[] = projection.nodes.map((n) => ({
      id: n.id,
      type: 'issue',
      position: layout.positions.get(n.id)!,
      data: { node: n },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      draggable: false,
    }));
    const laneNodes: LaneNode[] = layout.orphanLane
      ? [
          {
            id: '__lane',
            type: 'lane',
            position: { x: 0, y: layout.orphanLane.y },
            data: { label: 'No dependencies' },
            draggable: false,
            selectable: false,
          },
        ]
      : [];
    return [...issueNodes, ...laneNodes] as Node[];
  }, [projection]);

  // Edges are not measured, so recolouring them on hover costs nothing.
  const edges = useMemo<Edge[]>(
    () =>
      projection.edges.map((e) => {
        const active = hoveredId !== null && (e.from === hoveredId || e.to === hoveredId);
        const hierarchy = e.kind === 'subtask';
        const palette = EDGE_COLORS[theme];
        const color = active ? palette.active : hierarchy ? palette.subtask : palette.idle;
        return {
          id: `${e.from}>${e.to}`,
          source: e.from,
          target: e.to,
          markerEnd: { type: MarkerType.ArrowClosed, color },
          style: {
            stroke: color,
            strokeWidth: active ? 2.5 : 1.5,
            ...(hierarchy ? { strokeDasharray: EDGE_SUBTASK_DASH } : {}),
          },
          animated: active && !hierarchy,
        };
      }),
    [projection, hoveredId, theme],
  );

  const enterNode = (id: string): void => {
    const highlighted = new Set<string>([id]);
    for (const e of projection.edges) {
      if (e.from === id) highlighted.add(e.to);
      if (e.to === id) highlighted.add(e.from);
    }
    setHovered(id, highlighted);
  };

  // Nothing may stay highlighted once this graph is gone.
  useEffect(() => () => setHovered(null), [setHovered]);

  useEffect(() => {
    // Re-fit whenever the visible graph changes shape.
    const id = requestAnimationFrame(() => void fitView({ padding: 0.1 }));
    return () => cancelAnimationFrame(id);
  }, [roadmap, showResolved, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      nodesConnectable={false}
      elementsSelectable={false}
      onNodeMouseEnter={(_, n) => {
        if (n.type === 'issue') enterNode(n.id);
      }}
      onNodeMouseLeave={() => setHovered(null)}
      minZoom={0.1}
      colorMode={theme}
      fitView
    >
      <Background />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable />
    </ReactFlow>
  );
}
