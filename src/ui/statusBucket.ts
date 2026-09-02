import type { RoadmapNode } from '../graph/model';
import type { Theme } from './theme';

/** Coarse progress class of an issue, independent of the project's state names. */
export type StatusBucket = 'not-started' | 'in-progress' | 'review' | 'done';

export const BUCKET_ORDER: StatusBucket[] = ['not-started', 'in-progress', 'review', 'done'];

export interface BucketStyle {
  /** Card fill: a tint of the accent, light enough (or dark enough) for the text on top of it. */
  background: string;
  /** Left stripe: the saturated form of the same hue, still legible when zoomed out. */
  accent: string;
  color: string;
}

export const BUCKET_LABELS: Record<StatusBucket, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  review: 'In review',
  done: 'Done',
};

/**
 * The same four hues in both themes: a pale tint under dark text, or the hue sunk into the dark
 * surface under light text. Accents brighten in the dark theme so the stripe keeps its contrast.
 */
export const BUCKET_STYLES: Record<Theme, Record<StatusBucket, BucketStyle>> = {
  light: {
    'not-started': { background: '#f1f5f9', accent: '#94a3b8', color: '#111827' },
    'in-progress': { background: '#dbeafe', accent: '#2563eb', color: '#111827' },
    review: { background: '#fef3c7', accent: '#d97706', color: '#111827' },
    done: { background: '#dcfce7', accent: '#16a34a', color: '#111827' },
  },
  dark: {
    'not-started': { background: '#1e293b', accent: '#94a3b8', color: '#e2e8f0' },
    'in-progress': { background: '#172554', accent: '#60a5fa', color: '#e2e8f0' },
    review: { background: '#422006', accent: '#fbbf24', color: '#e2e8f0' },
    done: { background: '#052e16', accent: '#4ade80', color: '#e2e8f0' },
  },
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

function parseHex(hex: string): number | null {
  const match = HEX.exec(hex.trim());
  return match ? parseInt(match[1], 16) : null;
}

/**
 * Blends a 6-digit hex colour towards `base`: `ratio` 0 keeps it, 1 returns `base`. Returns null
 * for anything it cannot parse, so callers can fall back to a neutral.
 */
export function mixWith(hex: string, ratio: number, base: string): string | null {
  const packed = parseHex(hex);
  const packedBase = parseHex(base);
  if (packed === null || packedBase === null) return null;
  const channel = (shift: number): string => {
    const value = (packed >> shift) & 0xff;
    const target = (packedBase >> shift) & 0xff;
    return Math.round(value + (target - value) * ratio)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}
