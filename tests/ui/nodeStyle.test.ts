import { describe, it, expect } from 'vitest';
import { borderClass, kindLabel, stateColors } from '../../src/ui/nodeStyle';
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

  it('uses YouTrack state colours and falls back to neutral', () => {
    expect(
      stateColors({ ...base, state: { name: 'Open', background: '#123456', foreground: '#ffffff' } }),
    ).toEqual({ background: '#123456', color: '#ffffff' });
    expect(stateColors(base)).toEqual({ background: '#e5e7eb', color: '#111827' });
  });
});
