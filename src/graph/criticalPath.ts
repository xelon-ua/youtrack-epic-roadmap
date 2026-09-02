import type { RoadmapProjection } from './filter';

export interface CriticalPath {
  /** Every node that lies on at least one longest chain ending at the root. */
  nodeIds: ReadonlySet<string>;
  /** The steps of those chains, as `${from}>${to}`. */
  edgeKeys: ReadonlySet<string>;
  /** Nodes on the longest chain, the root included; 0 when the root has no chain. */
  length: number;
}

const EMPTY: CriticalPath = { nodeIds: new Set(), edgeKeys: new Set(), length: 0 };

export function edgeKey(from: string, to: string): string {
  return `${from}>${to}`;
}

/**
 * The longest chain of issues that has to finish before the root epic can, measured in issues:
 * the roadmap carries no estimates, so every issue counts as one step. Ties are kept rather than
 * broken — a node is critical when *some* longest chain runs through it, which is the same as
 * saying it has no slack. Nothing is suppressed when everything turns out critical; the toolbar
 * switch is what decides whether any of this is drawn.
 */
export function criticalPath(projection: RoadmapProjection): CriticalPath {
  const ids = new Set(projection.nodes.map((n) => n.id));
  const successors = new Map<string, string[]>();
  const predecessors = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const id of ids) {
    successors.set(id, []);
    predecessors.set(id, []);
    indegree.set(id, 0);
  }
  for (const e of projection.edges) {
    successors.get(e.from)!.push(e.to);
    predecessors.get(e.to)!.push(e.from);
    indegree.set(e.to, indegree.get(e.to)! + 1);
  }

  /*
   * Kahn's order doubles as cycle protection: a node inside a cycle never reaches indegree 0,
   * so it never gets a depth and no chain is ever routed through it. Cycles are reported
   * separately by `findCycles`.
   */
  const depth = new Map<string, number>();
  const queue = [...ids].filter((id) => indegree.get(id) === 0);
  for (const id of queue) depth.set(id, 1);
  for (let i = 0; i < queue.length; i++) {
    const u = queue[i];
    for (const v of successors.get(u)!) {
      depth.set(v, Math.max(depth.get(v) ?? 1, depth.get(u)! + 1));
      const remaining = indegree.get(v)! - 1;
      indegree.set(v, remaining);
      if (remaining === 0) queue.push(v);
    }
  }

  const rootDepth = depth.get(projection.rootId);
  if (rootDepth === undefined) return EMPTY;

  // Walk back from the root along the steps that actually gained a rank.
  const nodeIds = new Set<string>([projection.rootId]);
  const edgeKeys = new Set<string>();
  const stack = [projection.rootId];
  while (stack.length > 0) {
    const n = stack.pop()!;
    for (const p of predecessors.get(n)!) {
      if (depth.get(p) !== depth.get(n)! - 1) continue;
      edgeKeys.add(edgeKey(p, n));
      if (nodeIds.has(p)) continue;
      nodeIds.add(p);
      stack.push(p);
    }
  }
  return { nodeIds, edgeKeys, length: rootDepth };
}
