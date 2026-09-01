import { describe, it, expect } from 'vitest';
import { BUCKET_ORDER, BUCKET_STYLES, mixWithWhite, statusBucket } from '../../src/ui/statusBucket';
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

const withState = (name: string | null, resolved = false): RoadmapNode => ({
  ...base,
  resolved,
  state: name === null ? null : { name },
});

describe('statusBucket', () => {
  it('trusts the resolved flag over the state name', () => {
    expect(statusBucket(withState('Open', true))).toBe('done');
    expect(statusBucket(withState('In Progress', true))).toBe('done');
    expect(statusBucket(withState('Duplicate', true))).toBe('done');
  });

  it('maps the WMS state names', () => {
    expect(statusBucket(withState('Open'))).toBe('not-started');
    expect(statusBucket(withState('In Progress'))).toBe('in-progress');
    expect(statusBucket(withState('To Verify'))).toBe('review');
  });

  it('matches common synonyms case-insensitively', () => {
    expect(statusBucket(withState('in development'))).toBe('in-progress');
    expect(statusBucket(withState('WIP'))).toBe('in-progress');
    expect(statusBucket(withState('Code Review'))).toBe('review');
    expect(statusBucket(withState('Testing'))).toBe('review');
    expect(statusBucket(withState('QA'))).toBe('review');
  });

  it('lets review win when a name mentions both', () => {
    expect(statusBucket(withState('Code review in progress'))).toBe('review');
  });

  it('falls back to not-started for unknown or missing states', () => {
    expect(statusBucket(withState('Reopened'))).toBe('not-started');
    expect(statusBucket(withState('Not Started'))).toBe('not-started');
    expect(statusBucket(withState('Submitted'))).toBe('not-started');
    expect(statusBucket(withState(null))).toBe('not-started');
  });
});

describe('BUCKET_STYLES', () => {
  it('covers every bucket with a distinct accent', () => {
    expect(BUCKET_ORDER).toEqual(['not-started', 'in-progress', 'review', 'done']);
    const accents = BUCKET_ORDER.map((b) => BUCKET_STYLES[b].accent);
    expect(new Set(accents).size).toBe(BUCKET_ORDER.length);
    for (const b of BUCKET_ORDER) {
      expect(BUCKET_STYLES[b].background).toMatch(/^#[0-9a-f]{6}$/);
      expect(BUCKET_STYLES[b].label).toBeTruthy();
    }
  });
});

describe('mixWithWhite', () => {
  it('interpolates towards white', () => {
    expect(mixWithWhite('#000000', 0)).toBe('#000000');
    expect(mixWithWhite('#000000', 0.75)).toBe('#bfbfbf');
    expect(mixWithWhite('#123456', 1)).toBe('#ffffff');
  });

  it('accepts a hex colour without the hash and normalises the case', () => {
    expect(mixWithWhite('2563EB', 0)).toBe('#2563eb');
  });

  it('returns null for values it cannot parse', () => {
    expect(mixWithWhite('red', 0.5)).toBeNull();
    expect(mixWithWhite('#12345', 0.5)).toBeNull();
    expect(mixWithWhite('', 0.5)).toBeNull();
  });
});
