import type { ColorScheme } from '../auth/storage';
import type { NodeKind, RoadmapNode } from '../graph/model';
import { BUCKET_STYLES, mixWithWhite, statusBucket } from './statusBucket';

export function borderClass(kind: NodeKind): string {
  switch (kind) {
    case 'root':
      return 'border-4 border-solid border-gray-900';
    case 'epic':
      return 'border-2 border-solid border-gray-700';
    case 'external-prerequisite':
      return 'border-2 border-dashed border-gray-500';
    case 'external-dependent':
      return 'border-2 border-dotted border-gray-500';
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

export const NEUTRAL_COLORS: NodeColors = { background: '#e5e7eb', color: '#111827', accent: '#9ca3af' };

/** How much white is mixed into a YouTrack state colour to get a readable card fill. */
const YOUTRACK_TINT = 0.75;

/**
 * Card fill plus the accent used for the status stripe. Both schemes share the same
 * shape: a light fill for grouping at a glance, a saturated stripe that survives zoom-out.
 */
export function nodeColors(node: RoadmapNode, scheme: ColorScheme): NodeColors {
  if (scheme === 'youtrack') {
    const raw = node.state?.background;
    // mixWithWhite(_, 0) doubles as validation and normalisation of the YouTrack value.
    const accent = raw ? mixWithWhite(raw, 0) : null;
    const background = raw ? mixWithWhite(raw, YOUTRACK_TINT) : null;
    // The state's own foreground is meant for its undiluted colour; on the tint it can vanish.
    return accent && background ? { background, color: '#111827', accent } : NEUTRAL_COLORS;
  }
  const { background, color, accent } = BUCKET_STYLES[statusBucket(node)];
  return { background, color, accent };
}
