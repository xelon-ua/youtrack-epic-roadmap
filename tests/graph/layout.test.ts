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

  it('positions every visible node exactly once', () => {
    const p = projectRoadmap(roadmap, { showResolved: true });
    const r = layoutRoadmap(p);
    expect([...r.positions.keys()].sort()).toEqual(p.nodes.map((n) => n.id).sort());
  });

  it('puts orphans in a lane below the main graph', () => {
    const p = projectRoadmap(roadmap, { showResolved: true });
    const r = layoutRoadmap(p);
    const mainIds = p.nodes.map((n) => n.id).filter((id) => !p.orphanIds.includes(id));
    const mainBottom = Math.max(...mainIds.map((id) => y(r, id))) + NODE_HEIGHT;
    expect(r.orphanLane).not.toBeNull();
    expect(r.orphanLane!.y).toBeGreaterThan(mainBottom);
    for (const id of p.orphanIds) expect(y(r, id)).toBeGreaterThan(r.orphanLane!.y);
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
