import { describe, it, expect, beforeAll } from 'vitest';
import { collectRoadmap } from '../../src/graph/collect';
import { projectRoadmap, type RoadmapProjection } from '../../src/graph/filter';
import { criticalPath } from '../../src/graph/criticalPath';
import type { Roadmap, RoadmapNode } from '../../src/graph/model';
import { createFixtureFetch } from '../fixtures/epic';

let roadmap: Roadmap;
beforeAll(async () => {
  roadmap = await collectRoadmap('EP-1', createFixtureFetch().fetchIssue, { baseUrl: 'https://x' });
});

const node = (id: string): RoadmapNode => ({
  id,
  summary: id,
  kind: 'epic',
  resolved: false,
  state: null,
  assignee: null,
  project: 'X',
  parentId: null,
  url: `https://x/issue/${id}`,
});

/** Only ids and edges reach the algorithm, so a projection is spelled as `"from>to"` steps. */
function projection(rootId: string, steps: string[], loneIds: string[] = []): RoadmapProjection {
  const pairs = steps.map((s) => s.split('>') as [string, string]);
  const ids = new Set([rootId, ...loneIds, ...pairs.flat()]);
  return {
    rootId,
    nodes: [...ids].map(node),
    edges: pairs.map(([from, to]) => ({ from, to, kind: 'depend' as const })),
    orphanIds: [],
    hiddenCount: 0,
  };
}

const sorted = (ids: ReadonlySet<string>): string[] => [...ids].sort();

describe('criticalPath', () => {
  it('marks every node on a longest chain ending at the root', () => {
    const r = criticalPath(projectRoadmap(roadmap, { showResolved: true }));
    // EXT-11 → EXT-10 → EP-2 → EP-5 → EP-1, tied with EP-3 → EP-4 → EP-2 → EP-5 → EP-1.
    expect(sorted(r.nodeIds)).toEqual(['EP-1', 'EP-2', 'EP-3', 'EP-4', 'EP-5', 'EXT-10', 'EXT-11']);
    expect(r.length).toBe(5);
  });

  it('leaves out nodes with slack, nodes beyond the root and nodes in a cycle', () => {
    const r = criticalPath(projectRoadmap(roadmap, { showResolved: true }));
    expect(r.nodeIds.has('EP-6')).toBe(false); // reaches the root in one step
    expect(r.nodeIds.has('EP-9')).toBe(false);
    expect(r.nodeIds.has('OUT-20')).toBe(false); // downstream of the root
    expect(r.nodeIds.has('EP-7')).toBe(false); // EP-7 ⇄ EP-8 never gets a depth
    expect(r.nodeIds.has('EP-8')).toBe(false);
  });

  it('reports the steps of those chains, not every edge between critical nodes', () => {
    const r = criticalPath(projectRoadmap(roadmap, { showResolved: true }));
    expect(sorted(r.edgeKeys)).toEqual([
      'EP-2>EP-5',
      'EP-3>EP-4',
      'EP-4>EP-2',
      'EP-5>EP-1',
      'EXT-10>EP-2',
      'EXT-11>EXT-10',
    ]);
    // EP-3 → EP-2 joins two critical nodes but skips a rank, so it is not a step.
    expect(r.edgeKeys.has('EP-3>EP-2')).toBe(false);
  });

  it('follows the visible slice: hiding resolved issues shortens the path', () => {
    const r = criticalPath(projectRoadmap(roadmap, { showResolved: false }));
    // EP-3 and EXT-11 are resolved, so EP-4 and EXT-10 both start the chain.
    expect(sorted(r.nodeIds)).toEqual(['EP-1', 'EP-2', 'EP-4', 'EP-5', 'EXT-10']);
    expect(r.length).toBe(4);
  });

  it('keeps both branches of a tie and drops the shorter one', () => {
    const tie = criticalPath(projection('D', ['A>B', 'B>D', 'A>C', 'C>D']));
    expect(sorted(tie.nodeIds)).toEqual(['A', 'B', 'C', 'D']);
    expect(tie.length).toBe(3);

    const shortcut = criticalPath(projection('D', ['A>B', 'B>C', 'C>D', 'A>D']));
    expect(sorted(shortcut.nodeIds)).toEqual(['A', 'B', 'C', 'D']);
    expect(sorted(shortcut.edgeKeys)).toEqual(['A>B', 'B>C', 'C>D']);
  });

  it('marks the whole graph when the whole graph is one chain', () => {
    const r = criticalPath(projection('C', ['A>B', 'B>C']));
    expect(sorted(r.nodeIds)).toEqual(['A', 'B', 'C']);
    expect(r.length).toBe(3);
  });

  it('marks the root alone when nothing leads to it', () => {
    const r = criticalPath(projection('R', [], ['X', 'Y']));
    expect(sorted(r.nodeIds)).toEqual(['R']);
    expect(r.edgeKeys.size).toBe(0);
    expect(r.length).toBe(1);
  });

  it('reports nothing when the root itself sits in a cycle or is missing', () => {
    const cyclic = criticalPath(projection('B', ['A>B', 'B>A']));
    expect(cyclic.nodeIds.size).toBe(0);
    expect(cyclic.length).toBe(0);

    const empty = criticalPath({ rootId: 'R', nodes: [], edges: [], orphanIds: [], hiddenCount: 0 });
    expect(empty.nodeIds.size).toBe(0);
    expect(empty.length).toBe(0);
  });
});
