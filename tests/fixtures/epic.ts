import type { IssueDto, IssueLinkDto } from '../../src/api/types';
import { IssueNotFoundError } from '../../src/api/errors';

type Dir = 'OUTWARD' | 'INWARD';

export const link = (type: 'Subtask' | 'Depend', direction: Dir, ...ids: string[]): IssueLinkDto => ({
  direction,
  linkType: { name: type },
  issues: ids.map((idReadable) => ({ idReadable })),
});

export function makeIssue(
  id: string,
  opts: { summary?: string; resolved?: boolean; state?: string; links?: IssueLinkDto[]; project?: string } = {},
): IssueDto {
  const stateName = opts.state ?? (opts.resolved ? 'Done' : 'Open');
  return {
    idReadable: id,
    summary: opts.summary ?? `Issue ${id}`,
    resolved: opts.resolved ? 1700000000000 : null,
    project: { shortName: opts.project ?? id.split('-')[0] },
    customFields: [
      {
        name: 'State',
        value: {
          name: stateName,
          color: { background: opts.resolved ? '#cccccc' : '#cfe8ff', foreground: '#000000' },
        },
      },
      { name: 'Assignee', value: null },
    ],
    links: opts.links ?? [],
  };
}

/*
 * EP-1 (root, unresolved)
 *  ├─ EP-2  Phase A (unresolved)   depends on EXT-10 (outside); is required for EP-5
 *  │   ├─ EP-3 (resolved)          is required for EP-4, EP-5
 *  │   └─ EP-4 (unresolved)        depends on EP-3; is required for OUT-20 (outside)
 *  ├─ EP-5 (unresolved)            depends on EP-3, EP-2
 *  ├─ EP-6 (unresolved, orphan)
 *  ├─ EP-7 (unresolved)  ⇄ EP-8    cycle
 *  ├─ EP-8 (unresolved)  ⇄ EP-7
 *  └─ EP-9 — returns 404 (no access)
 * EXT-10 (outside) depends on EXT-11; has subtask EXT-12 (must NOT be collected)
 * EXT-11 (outside, resolved)
 * OUT-20 (outside) depends on EP-4 and OUT-21 (OUT-21 must NOT be collected)
 */
export const FIXTURE_ISSUES: Record<string, IssueDto> = {
  'EP-1': makeIssue('EP-1', {
    summary: 'Epic',
    links: [link('Subtask', 'OUTWARD', 'EP-2', 'EP-5', 'EP-6', 'EP-7', 'EP-8', 'EP-9')],
  }),
  'EP-2': makeIssue('EP-2', {
    summary: 'Phase A',
    links: [
      link('Subtask', 'INWARD', 'EP-1'),
      link('Subtask', 'OUTWARD', 'EP-3', 'EP-4'),
      link('Depend', 'INWARD', 'EXT-10'),
      link('Depend', 'OUTWARD', 'EP-5'),
    ],
  }),
  'EP-3': makeIssue('EP-3', {
    resolved: true,
    links: [link('Subtask', 'INWARD', 'EP-2'), link('Depend', 'OUTWARD', 'EP-4', 'EP-5')],
  }),
  'EP-4': makeIssue('EP-4', {
    links: [link('Subtask', 'INWARD', 'EP-2'), link('Depend', 'INWARD', 'EP-3'), link('Depend', 'OUTWARD', 'OUT-20')],
  }),
  'EP-5': makeIssue('EP-5', {
    links: [link('Subtask', 'INWARD', 'EP-1'), link('Depend', 'INWARD', 'EP-3', 'EP-2')],
  }),
  'EP-6': makeIssue('EP-6', { links: [link('Subtask', 'INWARD', 'EP-1')] }),
  'EP-7': makeIssue('EP-7', {
    links: [link('Subtask', 'INWARD', 'EP-1'), link('Depend', 'INWARD', 'EP-8'), link('Depend', 'OUTWARD', 'EP-8')],
  }),
  'EP-8': makeIssue('EP-8', {
    links: [link('Subtask', 'INWARD', 'EP-1'), link('Depend', 'INWARD', 'EP-7'), link('Depend', 'OUTWARD', 'EP-7')],
  }),
  'EXT-10': makeIssue('EXT-10', {
    links: [link('Depend', 'OUTWARD', 'EP-2'), link('Depend', 'INWARD', 'EXT-11'), link('Subtask', 'OUTWARD', 'EXT-12')],
  }),
  'EXT-11': makeIssue('EXT-11', { resolved: true, links: [link('Depend', 'OUTWARD', 'EXT-10')] }),
  'EXT-12': makeIssue('EXT-12', { links: [link('Subtask', 'INWARD', 'EXT-10')] }),
  'OUT-20': makeIssue('OUT-20', { links: [link('Depend', 'INWARD', 'EP-4', 'OUT-21')] }),
  'OUT-21': makeIssue('OUT-21', { links: [link('Depend', 'OUTWARD', 'OUT-20')] }),
};

/** Records every id requested so tests can assert what was (not) fetched. */
export function createFixtureFetch(issues: Record<string, IssueDto> = FIXTURE_ISSUES) {
  const requested: string[] = [];
  const fetchIssue = async (id: string): Promise<IssueDto> => {
    requested.push(id);
    const dto = issues[id];
    if (!dto) throw new IssueNotFoundError(id);
    return dto;
  };
  return { fetchIssue, requested };
}
