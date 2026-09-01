import type { IssueDto } from '../api/types';

export type NodeKind = 'root' | 'epic' | 'external-prerequisite' | 'external-dependent';

/** Lower number wins when an issue is reached through several classes. */
export const KIND_PRIORITY: Record<NodeKind, number> = {
  root: 0,
  epic: 1,
  'external-prerequisite': 2,
  'external-dependent': 3,
};

export interface NodeState {
  name: string;
  background?: string;
  foreground?: string;
}

export interface RoadmapNode {
  id: string;
  summary: string;
  kind: NodeKind;
  resolved: boolean;
  state: NodeState | null;
  assignee: string | null;
  project: string;
  parentId: string | null;
  url: string;
}

/** prerequisite → dependent */
export interface RoadmapEdge {
  from: string;
  to: string;
}

export interface Roadmap {
  rootId: string;
  nodes: Map<string, RoadmapNode>;
  edges: RoadmapEdge[];
  orphanIds: string[];
  cycles: string[][];
  truncated: boolean;
}

export function linkedIds(
  dto: IssueDto,
  type: 'Subtask' | 'Depend',
  direction: 'OUTWARD' | 'INWARD',
): string[] {
  return dto.links
    .filter((l) => l.linkType.name === type && l.direction === direction)
    .flatMap((l) => l.issues.map((i) => i.idReadable));
}

function field(dto: IssueDto, name: string): unknown {
  return dto.customFields.find((f) => f.name === name)?.value ?? null;
}

function readState(dto: IssueDto): NodeState | null {
  const v = field(dto, 'State') as
    | { name?: string; color?: { background?: string; foreground?: string } }
    | null;
  if (!v?.name) return null;
  return { name: v.name, background: v.color?.background, foreground: v.color?.foreground };
}

function readAssignee(dto: IssueDto): string | null {
  const v = field(dto, 'Assignee') as { name?: string } | null;
  return v?.name ?? null;
}

export function issueUrl(baseUrl: string, id: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/issue/${id}`;
}

export function toRoadmapNode(dto: IssueDto, kind: NodeKind, baseUrl: string): RoadmapNode {
  return {
    id: dto.idReadable,
    summary: dto.summary,
    kind,
    resolved: dto.resolved != null,
    state: readState(dto),
    assignee: readAssignee(dto),
    project: dto.project.shortName,
    parentId: linkedIds(dto, 'Subtask', 'INWARD')[0] ?? null,
    url: issueUrl(baseUrl, dto.idReadable),
  };
}
