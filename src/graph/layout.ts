import * as dagre from '@dagrejs/dagre';
import type { RoadmapProjection } from './filter';

export const NODE_WIDTH = 240;
export const NODE_HEIGHT = 72;
const RANK_SEP = 80;
const NODE_SEP = 30;
const LANE_GAP = 60; // space between main graph bottom and the lane label
const LANE_LABEL_HEIGHT = 40;
const ORPHANS_PER_ROW = 4;

export interface Point {
  x: number;
  y: number;
}

export interface LayoutResult {
  /** Top-left corner of each node, React Flow convention. */
  positions: Map<string, Point>;
  /** Y of the "No dependencies" lane label, or null when there are no orphans. */
  orphanLane: { y: number } | null;
}

export function layoutRoadmap(projection: RoadmapProjection): LayoutResult {
  const positions = new Map<string, Point>();
  const orphanSet = new Set(projection.orphanIds);
  const mainIds = projection.nodes.map((n) => n.id).filter((id) => !orphanSet.has(id));

  let mainBottom = 0;
  if (mainIds.length > 0) {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'LR', ranksep: RANK_SEP, nodesep: NODE_SEP, marginx: 0, marginy: 0 });
    g.setDefaultEdgeLabel(() => ({}));
    for (const id of mainIds) g.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    for (const e of projection.edges) g.setEdge(e.from, e.to);
    dagre.layout(g);
    for (const id of mainIds) {
      const n = g.node(id);
      const p = { x: n.x - NODE_WIDTH / 2, y: n.y - NODE_HEIGHT / 2 };
      positions.set(id, p);
      mainBottom = Math.max(mainBottom, p.y + NODE_HEIGHT);
    }
  }

  if (projection.orphanIds.length === 0) return { positions, orphanLane: null };

  const laneY = mainIds.length > 0 ? mainBottom + LANE_GAP : 0;
  projection.orphanIds.forEach((id, i) => {
    const col = i % ORPHANS_PER_ROW;
    const row = Math.floor(i / ORPHANS_PER_ROW);
    positions.set(id, {
      x: col * (NODE_WIDTH + NODE_SEP),
      y: laneY + LANE_LABEL_HEIGHT + row * (NODE_HEIGHT + NODE_SEP),
    });
  });
  return { positions, orphanLane: { y: laneY } };
}
