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

  it('gives every kind a border that stays visible in the dark theme', () => {
    for (const kind of ['root', 'epic', 'external-prerequisite', 'external-dependent'] as const) {
      expect(borderClass(kind)).toMatch(/dark:border-/);
    }
  });

  describe('semantic scheme', () => {
    it('colours a node from its status bucket', () => {
      const node = { ...base, state: { name: 'In Progress', background: '#123456' } };
      expect(nodeColors(node, 'semantic', 'light')).toEqual(BUCKET_STYLES.light['in-progress']);
      expect(nodeColors(node, 'semantic', 'dark')).toEqual(BUCKET_STYLES.dark['in-progress']);
    });

    it('ignores the YouTrack state colour', () => {
      const a = nodeColors({ ...base, state: { name: 'Open', background: '#123456' } }, 'semantic', 'light');
      const b = nodeColors({ ...base, state: { name: 'Open' } }, 'semantic', 'light');
      expect(a).toEqual(b);
    });
  });

  describe('youtrack scheme', () => {
    it('tints the state colour for the fill and keeps it saturated for the accent', () => {
      const node = { ...base, state: { name: 'Open', background: '#000000', foreground: '#ffffff' } };
      expect(nodeColors(node, 'youtrack', 'light')).toEqual({
        background: '#bfbfbf',
        color: '#111827',
        accent: '#000000',
      });
    });

    it('sinks the state colour into the dark surface and flips the text', () => {
      const node = { ...base, state: { name: 'Open', background: '#ffffff' } };
      const colors = nodeColors(node, 'youtrack', 'dark');
      expect(colors.accent).toBe('#ffffff');
      // A card fill that stays near the dark page background, not a glaring white block.
      expect(colors.background).toBe('#525866');
      expect(colors.color).toBe(BUCKET_STYLES.dark['not-started'].color);
    });

    it('falls back to the neutral of the current theme when the state has no colour', () => {
      expect(nodeColors({ ...base, state: { name: 'Open' } }, 'youtrack', 'light')).toEqual(NEUTRAL_COLORS.light);
      expect(nodeColors(base, 'youtrack', 'light')).toEqual(NEUTRAL_COLORS.light);
      expect(nodeColors(base, 'youtrack', 'dark')).toEqual(NEUTRAL_COLORS.dark);
    });

    it('falls back to neutral when the colour cannot be parsed', () => {
      expect(nodeColors({ ...base, state: { name: 'Open', background: 'chartreuse' } }, 'youtrack', 'light')).toEqual(
        NEUTRAL_COLORS.light,
      );
    });
  });
});
