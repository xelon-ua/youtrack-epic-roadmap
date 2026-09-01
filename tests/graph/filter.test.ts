import { describe, it, expect, beforeAll } from 'vitest';
import { collectRoadmap } from '../../src/graph/collect';
import { projectRoadmap } from '../../src/graph/filter';
import type { Roadmap } from '../../src/graph/model';
import { createFixtureFetch } from '../fixtures/epic';

let roadmap: Roadmap;
beforeAll(async () => {
  roadmap = await collectRoadmap('EP-1', createFixtureFetch().fetchIssue, { baseUrl: 'https://x' });
});

describe('projectRoadmap', () => {
  it('keeps everything when showResolved is true', () => {
    const p = projectRoadmap(roadmap, { showResolved: true });
    expect(p.nodes.length).toBe(roadmap.nodes.size);
    expect(p.edges.length).toBe(roadmap.edges.length);
    expect(p.hiddenCount).toBe(0);
    expect(p.orphanIds).toEqual(roadmap.orphanIds);
  });

  it('drops resolved nodes and their edges when showResolved is false', () => {
    const p = projectRoadmap(roadmap, { showResolved: false });
    const ids = p.nodes.map((n) => n.id);
    expect(ids).not.toContain('EP-3');
    expect(ids).not.toContain('EXT-11');
    expect(p.hiddenCount).toBe(2);
    expect(p.edges.some((e) => e.from === 'EP-3' || e.to === 'EP-3')).toBe(false);
    expect(p.edges.some((e) => e.from === 'EXT-11')).toBe(false);
    // Unaffected edges survive.
    expect(p.edges).toContainEqual({ from: 'EP-2', to: 'EP-5', kind: 'depend' });
  });

  it('never hides the root even when it is resolved', () => {
    const resolvedRoot: Roadmap = { ...roadmap, nodes: new Map(roadmap.nodes) };
    resolvedRoot.nodes.set('EP-1', { ...roadmap.nodes.get('EP-1')!, resolved: true });
    const p = projectRoadmap(resolvedRoot, { showResolved: false });
    expect(p.nodes.map((n) => n.id)).toContain('EP-1');
    expect(p.hiddenCount).toBe(2);
  });

  it('keeps only visible orphans', () => {
    // The fixture epic produces no orphans, so the ids are set by hand here.
    const withResolvedOrphan: Roadmap = {
      ...roadmap,
      nodes: new Map(roadmap.nodes),
      orphanIds: ['EP-1', 'EP-6', 'EP-9'],
    };
    withResolvedOrphan.nodes.set('EP-6', { ...roadmap.nodes.get('EP-6')!, resolved: true });
    const p = projectRoadmap(withResolvedOrphan, { showResolved: false });
    expect(p.orphanIds).toEqual(['EP-1', 'EP-9']);
  });
});
