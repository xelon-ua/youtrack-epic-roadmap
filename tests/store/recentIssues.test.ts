import { describe, it, expect } from 'vitest';
import { MAX_RECENT_ISSUES, rememberIssue } from '../../src/store/recentIssues';

describe('rememberIssue', () => {
  it('puts the issue at the head of an empty list', () => {
    expect(rememberIssue([], { id: 'WMS-1', summary: 'First' })).toEqual([
      { id: 'WMS-1', summary: 'First' },
    ]);
  });

  it('moves an issue built again to the head instead of duplicating it', () => {
    const list = [
      { id: 'WMS-1', summary: 'First' },
      { id: 'WMS-2', summary: 'Second' },
    ];
    expect(rememberIssue(list, { id: 'WMS-2', summary: 'Second' })).toEqual([
      { id: 'WMS-2', summary: 'Second' },
      { id: 'WMS-1', summary: 'First' },
    ]);
  });

  it('keeps the known summary when the issue is remembered without one', () => {
    const list = [{ id: 'WMS-1', summary: 'First' }];
    expect(rememberIssue(list, { id: 'WMS-1', summary: '' })).toEqual([
      { id: 'WMS-1', summary: 'First' },
    ]);
  });

  it('replaces the stored summary with a newly learnt one', () => {
    const list = [{ id: 'WMS-1', summary: '' }];
    expect(rememberIssue(list, { id: 'WMS-1', summary: 'Learnt later' })).toEqual([
      { id: 'WMS-1', summary: 'Learnt later' },
    ]);
  });

  it('drops the oldest issue once the list is full', () => {
    let list: { id: string; summary: string }[] = [];
    for (let i = 1; i <= MAX_RECENT_ISSUES + 2; i++) {
      list = rememberIssue(list, { id: `WMS-${i}`, summary: `Issue ${i}` });
    }
    expect(list).toHaveLength(MAX_RECENT_ISSUES);
    expect(list[0].id).toBe(`WMS-${MAX_RECENT_ISSUES + 2}`);
    expect(list.at(-1)?.id).toBe('WMS-3');
  });

  it('leaves the list it was given untouched', () => {
    const list = [{ id: 'WMS-1', summary: 'First' }];
    rememberIssue(list, { id: 'WMS-2', summary: 'Second' });
    expect(list).toEqual([{ id: 'WMS-1', summary: 'First' }]);
  });
});
