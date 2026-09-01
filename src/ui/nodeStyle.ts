import type { NodeKind, RoadmapNode } from '../graph/model';

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

export function stateColors(node: RoadmapNode): { background: string; color: string } {
  return {
    background: node.state?.background ?? '#e5e7eb',
    color: node.state?.foreground ?? '#111827',
  };
}
