import type { Roadmap, RoadmapEdge, RoadmapNode } from './model';

export interface RoadmapProjection {
  rootId: string;
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
  orphanIds: string[];
  hiddenCount: number;
}

/**
 * Visible slice of a roadmap. Hidden nodes disappear together with their edges;
 * no bridging edges are synthesized, so a node whose prerequisites are all resolved
 * naturally ends up in layer 0 once resolved issues are hidden. The root is never hidden.
 */
export function projectRoadmap(roadmap: Roadmap, opts: { showResolved: boolean }): RoadmapProjection {
  const visible = (n: RoadmapNode): boolean => opts.showResolved || !n.resolved || n.id === roadmap.rootId;
  const nodes = [...roadmap.nodes.values()].filter(visible);
  const visibleIds = new Set(nodes.map((n) => n.id));
  return {
    rootId: roadmap.rootId,
    nodes,
    edges: roadmap.edges.filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to)),
    orphanIds: roadmap.orphanIds.filter((id) => visibleIds.has(id)),
    hiddenCount: roadmap.nodes.size - nodes.length,
  };
}
