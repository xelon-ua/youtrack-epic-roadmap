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
import { criticalPath, edgeKey } from '../graph/criticalPath';
import { useHoverStore } from '../store/hoverStore';
import { useCriticalPathStore } from '../store/criticalPathStore';
import { useSettingsStore } from '../store/settingsStore';
import { IssueNode, type IssueFlowNode } from './IssueNode';
import { useTheme, type Theme } from './theme';
import { nodeColors } from './nodeStyle';

type LaneNode = Node<{ label: string }, 'lane'>;

function LaneLabel({ data }: NodeProps<LaneNode>) {
  return (
    <div className="select-none text-sm font-semibold uppercase tracking-wide text-muted">
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
  /* Matches the rose outline the cards on the path wear. */
  critical: string;
}

/*
 * `active` and `critical` are the `--app-hover` and `--app-critical` tokens of index.css: violet
 * and rose, because blue and amber already name the "In progress" and "In review" statuses.
 */
const EDGE_COLORS: Record<Theme, EdgeColors> = {
  light: { idle: '#94a3b8', active: '#8b5cf6', subtask: '#cbd5e1', critical: '#e11d48' },
  dark: { idle: '#64748b', active: '#a78bfa', subtask: '#3f4a5f', critical: '#fb7185' },
};

const NO_IDS: ReadonlySet<string> = new Set();
const NO_KEYS: ReadonlySet<string> = new Set();

const EDGE_SUBTASK_DASH = '6 4';

export function RoadmapCanvas({ roadmap, showResolved }: { roadmap: Roadmap; showResolved: boolean }) {
  const hoveredId = useHoverStore((s) => s.hoveredId);
  const theme = useTheme();
  const setHovered = useHoverStore((s) => s.setHovered);
  const setCriticalPath = useCriticalPathStore((s) => s.setCriticalPath);
  const showCriticalPath = useSettingsStore((s) => s.settings.criticalPath);
  const epicLinks = useSettingsStore((s) => s.settings.epicLinks);
  const scheme = useSettingsStore((s) => s.settings.colorScheme);
  const { fitView } = useReactFlow();

  const projection = useMemo(() => projectRoadmap(roadmap, { showResolved }), [roadmap, showResolved]);

  /*
   * The path follows the visible slice: hiding resolved issues shortens it. It is computed
   * whether or not it is drawn — one pass over the graph — and the switch decides what is
   * published to the cards and to the toolbar.
   */
  const path = useMemo(() => criticalPath(projection), [projection]);
  const criticalEdges = showCriticalPath ? path.edgeKeys : NO_KEYS;
  useEffect(() => {
    setCriticalPath(showCriticalPath ? path.nodeIds : NO_IDS);
  }, [showCriticalPath, path, setCriticalPath]);

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
        const critical = criticalEdges.has(edgeKey(e.from, e.to));
        /*
         * Every child of the root epic points at it, which says nothing the layout does not; hiding
         * those edges (not removing them) keeps the layout still. A step of the critical path stays.
         */
        const hidden = !epicLinks && hierarchy && e.to === projection.rootId && !critical;
        const palette = EDGE_COLORS[theme];
        const color = active
          ? palette.active
          : critical
            ? palette.critical
            : hierarchy
              ? palette.subtask
              : palette.idle;
        return {
          id: `${e.from}>${e.to}`,
          source: e.from,
          target: e.to,
          markerEnd: { type: MarkerType.ArrowClosed, color },
          style: {
            stroke: color,
            strokeWidth: active || critical ? 2.5 : 1.5,
            ...(hierarchy ? { strokeDasharray: EDGE_SUBTASK_DASH } : {}),
          },
          animated: active && !hierarchy,
          hidden,
        };
      }),
    [projection, hoveredId, theme, criticalEdges, epicLinks],
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
  useEffect(() => () => setCriticalPath(NO_IDS), [setCriticalPath]);

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
      <Controls showInteractive={false} position="bottom-left" />
      <MiniMap
        pannable
        zoomable
        position="bottom-right"
        // The overview keeps the status colours, so a stalled region shows up before zooming in.
        nodeColor={(n) => (n.type === 'issue' ? nodeColors((n as IssueFlowNode).data.node, scheme, theme).accent : 'transparent')}
        nodeBorderRadius={4}
      />
    </ReactFlow>
  );
}
