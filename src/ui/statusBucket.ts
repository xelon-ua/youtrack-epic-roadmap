import type { RoadmapNode } from '../graph/model';

/** Coarse progress class of an issue, independent of the project's state names. */
export type StatusBucket = 'not-started' | 'in-progress' | 'review' | 'done';

export const BUCKET_ORDER: StatusBucket[] = ['not-started', 'in-progress', 'review', 'done'];

export interface BucketStyle {
  /** Card fill: a light tint, so dark text stays readable on top of it. */
  background: string;
  /** Left stripe: the saturated form of the same hue, still legible when zoomed out. */
  accent: string;
  color: string;
  label: string;
}

export const BUCKET_STYLES: Record<StatusBucket, BucketStyle> = {
  'not-started': { background: '#f1f5f9', accent: '#94a3b8', color: '#111827', label: 'Not started' },
  'in-progress': { background: '#dbeafe', accent: '#2563eb', color: '#111827', label: 'In progress' },
  review: { background: '#fef3c7', accent: '#d97706', color: '#111827', label: 'In review' },
  done: { background: '#dcfce7', accent: '#16a34a', color: '#111827', label: 'Done' },
};

/** Tested before IN_PROGRESS so that "code review in progress" counts as review. */
const REVIEW = /verify|review|\bqa\b|test|check/;
const IN_PROGRESS = /progress|in work|development|doing|ongoing|\bwip\b/;

export function statusBucket(node: RoadmapNode): StatusBucket {
  // YouTrack reports resolution itself, so "done" never depends on guessing the state name.
  if (node.resolved) return 'done';
  const name = node.state?.name.toLowerCase() ?? '';
  if (REVIEW.test(name)) return 'review';
  if (IN_PROGRESS.test(name)) return 'in-progress';
  return 'not-started';
}

const HEX = /^#?([0-9a-f]{6})$/i;

/**
 * Blends a 6-digit hex colour towards white: `ratio` 0 keeps it, 1 returns white.
 * Returns null for anything it cannot parse, so callers can fall back to a neutral.
 */
export function mixWithWhite(hex: string, ratio: number): string | null {
  const match = HEX.exec(hex.trim());
  if (!match) return null;
  const packed = parseInt(match[1], 16);
  const channel = (shift: number): string => {
    const value = (packed >> shift) & 0xff;
    return Math.round(value + (255 - value) * ratio)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}
