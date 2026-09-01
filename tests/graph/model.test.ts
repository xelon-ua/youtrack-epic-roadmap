import { describe, it, expect } from 'vitest';
import { toRoadmapNode, linkedIds } from '../../src/graph/model';
import type { IssueDto } from '../../src/api/types';

const dto: IssueDto = {
  idReadable: 'WMS-1',
  summary: 'Root',
  resolved: 1700000000000,
  project: { shortName: 'WMS' },
  customFields: [
    { name: 'State', value: { name: 'Done', color: { background: '#0f0', foreground: '#000' } } },
    { name: 'Assignee', value: { name: 'Ann' } },
  ],
  links: [
    { direction: 'OUTWARD', linkType: { name: 'Subtask' }, issues: [{ idReadable: 'WMS-2' }, { idReadable: 'WMS-3' }] },
    { direction: 'INWARD', linkType: { name: 'Subtask' }, issues: [{ idReadable: 'WMS-0' }] },
    { direction: 'INWARD', linkType: { name: 'Depend' }, issues: [{ idReadable: 'WMS-9' }] },
    { direction: 'BOTH', linkType: { name: 'Relates' }, issues: [{ idReadable: 'WMS-8' }] },
  ],
};

describe('toRoadmapNode', () => {
  it('maps fields, state colour, assignee, parent and url', () => {
    const n = toRoadmapNode(dto, 'epic', 'https://x.youtrack.cloud/');
    expect(n).toEqual({
      id: 'WMS-1',
      summary: 'Root',
      kind: 'epic',
      resolved: true,
      state: { name: 'Done', background: '#0f0', foreground: '#000' },
      assignee: 'Ann',
      project: 'WMS',
      parentId: 'WMS-0',
      url: 'https://x.youtrack.cloud/issue/WMS-1',
    });
  });

  it('tolerates missing State/Assignee fields', () => {
    const n = toRoadmapNode({ ...dto, customFields: [], resolved: null }, 'root', 'https://x');
    expect(n.state).toBeNull();
    expect(n.assignee).toBeNull();
    expect(n.resolved).toBe(false);
  });
});

describe('linkedIds', () => {
  it('filters by type and direction', () => {
    expect(linkedIds(dto, 'Subtask', 'OUTWARD')).toEqual(['WMS-2', 'WMS-3']);
    expect(linkedIds(dto, 'Subtask', 'INWARD')).toEqual(['WMS-0']);
    expect(linkedIds(dto, 'Depend', 'INWARD')).toEqual(['WMS-9']);
    expect(linkedIds(dto, 'Depend', 'OUTWARD')).toEqual([]);
  });
});
