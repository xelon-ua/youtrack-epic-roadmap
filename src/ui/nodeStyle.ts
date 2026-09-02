import type { ColorScheme } from '../auth/storage';
import type { NodeKind, RoadmapNode } from '../graph/model';
import { BUCKET_STYLES, mixWith, statusBucket } from './statusBucket';
import type { Theme } from './theme';

export function borderClass(kind: NodeKind): string {
  switch (kind) {
    case 'root':
      return 'border-4 border-solid border-gray-900 dark:border-gray-100';
    case 'epic':
      return 'border-2 border-solid border-gray-700 dark:border-gray-300';
    case 'external-prerequisite':
      return 'border-2 border-dashed border-gray-500 dark:border-gray-400';
    case 'external-dependent':
      return 'border-2 border-dotted border-gray-500 dark:border-gray-400';
  }
}

export function kindLabel(kind: NodeKind): string | null {
  switch (kind) {
    case 'root':
      return 'epic';
    case 'epic':
      return null;
    case 'external-prerequisite':
      return 'outside epic';
    case 'external-dependent':
      return 'outside epic ↗';
  }
}

export interface NodeColors {
  background: string;
  color: string;
  accent: string;
}

export const NEUTRAL_COLORS: Record<Theme, NodeColors> = {
  light: { background: '#e5e7eb', color: '#111827', accent: '#9ca3af' },
  dark: { background: '#334155', color: '#e2e8f0', accent: '#94a3b8' },
};

/** The surface a YouTrack state colour is diluted into, and how much of it is mixed in. */
const YOUTRACK_SURFACE: Record<Theme, string> = { light: '#ffffff', dark: '#0f172a' };
const YOUTRACK_TINT: Record<Theme, number> = { light: 0.75, dark: 0.72 };

/**
 * Card fill plus the accent used for the status stripe. Both schemes share the same shape: a
 * tinted fill for grouping at a glance, a saturated stripe that survives zoom-out.
 */
export function nodeColors(node: RoadmapNode, scheme: ColorScheme, theme: Theme): NodeColors {
  if (scheme === 'youtrack') {
    const raw = node.state?.background;
    const surface = YOUTRACK_SURFACE[theme];
    // mixWith(_, 0, _) doubles as validation and normalisation of the YouTrack value.
    const accent = raw ? mixWith(raw, 0, surface) : null;
    const background = raw ? mixWith(raw, YOUTRACK_TINT[theme], surface) : null;
    // The state's own foreground is meant for its undiluted colour; on the tint it can vanish.
    return accent && background
      ? { background, color: BUCKET_STYLES[theme]['not-started'].color, accent }
      : NEUTRAL_COLORS[theme];
  }
  return BUCKET_STYLES[theme][statusBucket(node)];
}
