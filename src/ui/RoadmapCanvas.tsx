import { useEffect, useMemo, useState } from 'react';
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
import { layoutRoadmap } from '../graph/layout';
import { IssueNode, type IssueFlowNode } from './IssueNode';

type LaneNode = Node<{ label: string }, 'lane'>;

function LaneLabel({ data }: NodeProps<LaneNode>) {
  return (
    <div className="select-none text-sm font-semibold uppercase tracking-wide text-gray-500">{data.label}</div>
  );
}

const nodeTypes: NodeTypes = { issue: IssueNode, lane: LaneLabel };

const EDGE_IDLE = '#9ca3af';
const EDGE_ACTIVE = '#2563eb';

export function RoadmapCanvas({ roadmap, showResolved }: { roadmap: Roadmap; showResolved: boolean }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { fitView } = useReactFlow();

  const { nodes, edges } = useMemo(() => {
    const projection = projectRoadmap(roadmap, { showResolved });
    const layout = layoutRoadmap(projection);
    const neighbours = new Set<string>();
    if (hoveredId) {
      for (const e of projection.edges) {
        if (e.from === hoveredId) neighbours.add(e.to);
        if (e.to === hoveredId) neighbours.add(e.from);
      }
    }
    const issueNodes: IssueFlowNode[] = projection.nodes.map((n) => ({
      id: n.id,
      type: 'issue',
      position: layout.positions.get(n.id)!,
      data: { node: n, highlighted: hoveredId === n.id || neighbours.has(n.id) },
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
    const flowEdges: Edge[] = projection.edges.map((e) => {
      const active = hoveredId !== null && (e.from === hoveredId || e.to === hoveredId);
      const color = active ? EDGE_ACTIVE : EDGE_IDLE;
      return {
        id: `${e.from}>${e.to}`,
        source: e.from,
        target: e.to,
        markerEnd: { type: MarkerType.ArrowClosed, color },
        style: { stroke: color, strokeWidth: active ? 2.5 : 1.5 },
        animated: active,
      };
    });
    return { nodes: [...issueNodes, ...laneNodes] as Node[], edges: flowEdges };
  }, [roadmap, showResolved, hoveredId]);

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
        if (n.type === 'issue') setHoveredId(n.id);
      }}
      onNodeMouseLeave={() => setHoveredId(null)}
      minZoom={0.1}
      fitView
    >
      <Background />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable />
    </ReactFlow>
  );
}
