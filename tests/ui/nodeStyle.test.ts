import { describe, it, expect } from 'vitest';
import { NEUTRAL_COLORS, borderClass, kindLabel, nodeColors } from '../../src/ui/nodeStyle';
import { BUCKET_STYLES } from '../../src/ui/statusBucket';
import type { RoadmapNode } from '../../src/graph/model';

const base: RoadmapNode = {
  id: 'A-1',
  summary: 's',
  kind: 'epic',
  resolved: false,
  state: null,
  assignee: null,
  project: 'A',
  parentId: null,
  url: 'https://x/issue/A-1',
};

describe('nodeStyle', () => {
  it('maps kinds to border classes and labels', () => {
    expect(borderClass('root')).toContain('border-4');
    expect(borderClass('epic')).toContain('border-solid');
    expect(borderClass('external-prerequisite')).toContain('border-dashed');
    expect(borderClass('external-dependent')).toContain('border-dotted');
    expect(kindLabel('epic')).toBeNull();
    expect(kindLabel('root')).toBe('epic');
    expect(kindLabel('external-prerequisite')).toBe('outside epic');
    expect(kindLabel('external-dependent')).toBe('outside epic ↗');
  });

  describe('semantic scheme', () => {
    it('colours a node from its status bucket', () => {
      const node = { ...base, state: { name: 'In Progress', background: '#123456' } };
      const { background, color, accent } = BUCKET_STYLES['in-progress'];
      expect(nodeColors(node, 'semantic')).toEqual({ background, color, accent });
    });

    it('ignores the YouTrack state colour', () => {
      const a = nodeColors({ ...base, state: { name: 'Open', background: '#123456' } }, 'semantic');
      const b = nodeColors({ ...base, state: { name: 'Open' } }, 'semantic');
      expect(a).toEqual(b);
    });
  });

  describe('youtrack scheme', () => {
    it('tints the state colour for the fill and keeps it saturated for the accent', () => {
      const node = { ...base, state: { name: 'Open', background: '#000000', foreground: '#ffffff' } };
      expect(nodeColors(node, 'youtrack')).toEqual({
        background: '#bfbfbf',
        color: '#111827',
        accent: '#000000',
      });
    });

    it('falls back to neutral when the state has no colour', () => {
      expect(nodeColors({ ...base, state: { name: 'Open' } }, 'youtrack')).toEqual(NEUTRAL_COLORS);
      expect(nodeColors(base, 'youtrack')).toEqual(NEUTRAL_COLORS);
    });

    it('falls back to neutral when the colour cannot be parsed', () => {
      expect(nodeColors({ ...base, state: { name: 'Open', background: 'chartreuse' } }, 'youtrack')).toEqual(
        NEUTRAL_COLORS,
      );
    });
  });
});
