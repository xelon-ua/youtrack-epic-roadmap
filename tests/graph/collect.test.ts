import { describe, it, expect } from 'vitest';
import { collectRoadmap } from '../../src/graph/collect';
import { IssueNotFoundError } from '../../src/api/errors';
import { createFixtureFetch, makeIssue, link } from '../fixtures/epic';

const BASE = 'https://x.youtrack.cloud';

async function build(limit?: number) {
  const { fetchIssue, requested } = createFixtureFetch();
  const roadmap = await collectRoadmap('EP-1', fetchIssue, { baseUrl: BASE, limit });
  return { roadmap, requested };
}

const edgeKeys = (edges: { from: string; to: string }[]) => edges.map((e) => `${e.from}>${e.to}`).sort();

describe('collectRoadmap', () => {
  it('collects the whole subtask tree recursively, intermediate parents included', async () => {
    const { roadmap } = await build();
    for (const id of ['EP-1', 'EP-2', 'EP-3', 'EP-4', 'EP-5', 'EP-6', 'EP-7', 'EP-8']) {
      expect(roadmap.nodes.has(id), id).toBe(true);
    }
    expect(roadmap.nodes.get('EP-1')!.kind).toBe('root');
    expect(roadmap.nodes.get('EP-2')!.kind).toBe('epic');
    expect(roadmap.nodes.get('EP-4')!.kind).toBe('epic');
    expect(roadmap.nodes.get('EP-4')!.parentId).toBe('EP-2');
    expect(roadmap.rootId).toBe('EP-1');
  });

  it('follows external prerequisites recursively but not their subtasks', async () => {
    const { roadmap, requested } = await build();
    expect(roadmap.nodes.get('EXT-10')!.kind).toBe('external-prerequisite');
    expect(roadmap.nodes.get('EXT-11')!.kind).toBe('external-prerequisite');
    expect(roadmap.nodes.has('EXT-12')).toBe(false);
    expect(requested).not.toContain('EXT-12');
  });

  it('collects external dependents one level deep only', async () => {
    const { roadmap, requested } = await build();
    expect(roadmap.nodes.get('OUT-20')!.kind).toBe('external-dependent');
    expect(roadmap.nodes.has('OUT-21')).toBe(false);
    expect(requested).not.toContain('OUT-21');
  });

  it('fetches every issue exactly once and reports progress', async () => {
    const { fetchIssue, requested } = createFixtureFetch();
    const progress: number[] = [];
    await collectRoadmap('EP-1', fetchIssue, { baseUrl: BASE, onProgress: (n) => progress.push(n) });
    expect(new Set(requested).size).toBe(requested.length);
    expect(progress.at(-1)).toBe(requested.length);
  });

  it('builds prerequisite → dependent edges without duplicates', async () => {
    const { roadmap } = await build();
    expect(edgeKeys(roadmap.edges)).toEqual(
      ['EP-3>EP-4', 'EP-3>EP-5', 'EP-2>EP-5', 'EXT-10>EP-2', 'EXT-11>EXT-10', 'EP-4>OUT-20', 'EP-7>EP-8', 'EP-8>EP-7'].sort(),
    );
  });

  it('lists orphans (root first) and keeps inaccessible children as placeholders', async () => {
    const { roadmap } = await build();
    expect(roadmap.orphanIds).toEqual(['EP-1', 'EP-6', 'EP-9']);
    const noAccess = roadmap.nodes.get('EP-9')!;
    expect(noAccess.summary).toBe('(no access)');
    expect(noAccess.kind).toBe('epic');
    expect(noAccess.state).toBeNull();
  });

  it('detects dependency cycles', async () => {
    const { roadmap } = await build();
    expect(roadmap.cycles.length).toBe(1);
    expect([...roadmap.cycles[0]].sort()).toEqual(['EP-7', 'EP-8']);
  });

  it('stops at the issue limit and flags truncation', async () => {
    const { roadmap } = await build(3);
    expect(roadmap.truncated).toBe(true);
    expect(roadmap.nodes.size).toBeLessThanOrEqual(3);
    expect(roadmap.nodes.has('EP-1')).toBe(true);
  });

  it('is not truncated when under the limit', async () => {
    const { roadmap } = await build();
    expect(roadmap.truncated).toBe(false);
  });

  it('rejects when the root is not accessible', async () => {
    const { fetchIssue } = createFixtureFetch();
    await expect(collectRoadmap('NOPE-1', fetchIssue, { baseUrl: BASE })).rejects.toBeInstanceOf(IssueNotFoundError);
  });

  it('rejects with AbortError when the signal is already aborted', async () => {
    const { fetchIssue } = createFixtureFetch();
    const controller = new AbortController();
    controller.abort();
    await expect(
      collectRoadmap('EP-1', fetchIssue, { baseUrl: BASE, signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('applies class priority when an issue is reachable through several classes', async () => {
    // R has children A (R-2) and B (R-3). A depends on X (X is a prerequisite). B is
    // required for X (X is also a dependent). X must stay 'external-prerequisite';
    // R-3 is in the tree and must stay 'epic'.
    const issues = {
      'R-1': makeIssue('R-1', { links: [link('Subtask', 'OUTWARD', 'R-2', 'R-3')] }),
      'R-2': makeIssue('R-2', {
        links: [link('Subtask', 'INWARD', 'R-1'), link('Depend', 'INWARD', 'X-1'), link('Depend', 'OUTWARD', 'R-3')],
      }),
      'R-3': makeIssue('R-3', {
        links: [link('Subtask', 'INWARD', 'R-1'), link('Depend', 'INWARD', 'R-2'), link('Depend', 'OUTWARD', 'X-1')],
      }),
      'X-1': makeIssue('X-1', { links: [link('Depend', 'OUTWARD', 'R-2'), link('Depend', 'INWARD', 'R-3')] }),
    };
    const { fetchIssue } = createFixtureFetch(issues);
    const roadmap = await collectRoadmap('R-1', fetchIssue, { baseUrl: BASE });
    expect(roadmap.nodes.get('X-1')!.kind).toBe('external-prerequisite');
    expect(roadmap.nodes.get('R-3')!.kind).toBe('epic');
    expect(edgeKeys(roadmap.edges)).toEqual(['R-2>R-3', 'R-3>X-1', 'X-1>R-2'].sort());
  });
});
