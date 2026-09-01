import { describe, it, expect, beforeAll } from 'vitest';
import { collectRoadmap } from '../../src/graph/collect';
import { projectRoadmap, type RoadmapProjection } from '../../src/graph/filter';
import { layoutRoadmap, NODE_HEIGHT } from '../../src/graph/layout';
import type { Roadmap } from '../../src/graph/model';
import { createFixtureFetch } from '../fixtures/epic';

let roadmap: Roadmap;
beforeAll(async () => {
  roadmap = await collectRoadmap('EP-1', createFixtureFetch().fetchIssue, { baseUrl: 'https://x' });
});

const x = (r: ReturnType<typeof layoutRoadmap>, id: string) => r.positions.get(id)!.x;
const y = (r: ReturnType<typeof layoutRoadmap>, id: string) => r.positions.get(id)!.y;

describe('layoutRoadmap', () => {
  it('places prerequisites left of dependents', () => {
    const r = layoutRoadmap(projectRoadmap(roadmap, { showResolved: true }));
    expect(x(r, 'EXT-11')).toBeLessThan(x(r, 'EXT-10'));
    expect(x(r, 'EXT-10')).toBeLessThan(x(r, 'EP-2'));
    expect(x(r, 'EP-2')).toBeLessThan(x(r, 'EP-5'));
    expect(x(r, 'EP-3')).toBeLessThan(x(r, 'EP-4'));
    expect(x(r, 'EP-4')).toBeLessThan(x(r, 'OUT-20'));
  });

  it('places a parent to the right of all of its subtasks', () => {
    const r = layoutRoadmap(projectRoadmap(roadmap, { showResolved: true }));
    for (const child of ['EP-3', 'EP-4']) expect(x(r, child), child).toBeLessThan(x(r, 'EP-2'));
    for (const child of ['EP-2', 'EP-5', 'EP-6', 'EP-9']) expect(x(r, child), child).toBeLessThan(x(r, 'EP-1'));
  });

  it('positions every visible node exactly once', () => {
    const p = projectRoadmap(roadmap, { showResolved: true });
    const r = layoutRoadmap(p);
    expect([...r.positions.keys()].sort()).toEqual(p.nodes.map((n) => n.id).sort());
  });

  it('puts orphans in a lane below the main graph', () => {
    // The fixture epic has no orphans any more (every subtask is linked to its parent),
    // so the lane geometry is pinned on a hand-built projection.
    const p: RoadmapProjection = {
      rootId: 'EP-1',
      nodes: [roadmap.nodes.get('EP-3')!, roadmap.nodes.get('EP-4')!, roadmap.nodes.get('EP-6')!],
      edges: [{ from: 'EP-3', to: 'EP-4', kind: 'depend' }],
      orphanIds: ['EP-6'],
      hiddenCount: 0,
    };
    const r = layoutRoadmap(p);
    const mainBottom = Math.max(y(r, 'EP-3'), y(r, 'EP-4')) + NODE_HEIGHT;
    expect(r.orphanLane).not.toBeNull();
    expect(r.orphanLane!.y).toBeGreaterThan(mainBottom);
    expect(y(r, 'EP-6')).toBeGreaterThan(r.orphanLane!.y);
  });

  it('moves a node to the first layer once its only prerequisite is hidden', () => {
    const p = projectRoadmap(roadmap, { showResolved: false });
    const r = layoutRoadmap(p);
    const mainIds = p.nodes.map((n) => n.id).filter((id) => !p.orphanIds.includes(id));
    const minX = Math.min(...mainIds.map((id) => x(r, id)));
    expect(x(r, 'EP-4')).toBe(minX); // EP-3 (its prerequisite) is hidden
  });

  it('handles an empty projection and an orphans-only projection', () => {
    const empty: RoadmapProjection = { rootId: 'R', nodes: [], edges: [], orphanIds: [], hiddenCount: 0 };
    expect(layoutRoadmap(empty).positions.size).toBe(0);
    expect(layoutRoadmap(empty).orphanLane).toBeNull();

    const onlyOrphans: RoadmapProjection = {
      rootId: 'EP-1',
      nodes: [roadmap.nodes.get('EP-1')!, roadmap.nodes.get('EP-6')!],
      edges: [],
      orphanIds: ['EP-1', 'EP-6'],
      hiddenCount: 0,
    };
    const r = layoutRoadmap(onlyOrphans);
    expect(r.orphanLane!.y).toBe(0);
    expect(r.positions.size).toBe(2);
  });
});
