import type { IssueDto } from '../api/types';
import { IssueNotFoundError } from '../api/errors';
import {
  KIND_PRIORITY,
  linkedIds,
  toRoadmapNode,
  issueUrl,
  type EdgeKind,
  type NodeKind,
  type Roadmap,
  type RoadmapEdge,
  type RoadmapNode,
} from './model';

export type FetchIssue = (id: string, signal?: AbortSignal) => Promise<IssueDto>;

export interface CollectOptions {
  baseUrl: string;
  /** Soft cap on fetched issues; default 500. */
  limit?: number;
  /** Parallel requests; default 6. */
  concurrency?: number;
  signal?: AbortSignal;
  onProgress?: (fetched: number) => void;
}

const DEFAULT_LIMIT = 500;
const DEFAULT_CONCURRENCY = 6;

type ResolvedOptions = Required<Pick<CollectOptions, 'baseUrl' | 'limit' | 'concurrency'>> &
  Pick<CollectOptions, 'signal' | 'onProgress'>;

function abortError(): DOMException {
  return new DOMException('Roadmap build aborted', 'AbortError');
}

class Collector {
  /** null = fetched but inaccessible (placeholder). */
  private readonly fetched = new Map<string, IssueDto | null>();
  private readonly kinds = new Map<string, NodeKind>();
  private readonly fetchIssue: FetchIssue;
  private readonly opts: ResolvedOptions;
  private fetchedCount = 0;
  truncated = false;

  constructor(fetchIssue: FetchIssue, opts: ResolvedOptions) {
    this.fetchIssue = fetchIssue;
    this.opts = opts;
  }

  has(id: string): boolean {
    return this.fetched.has(id);
  }

  dto(id: string): IssueDto | null {
    return this.fetched.get(id) ?? null;
  }

  ids(): string[] {
    return [...this.fetched.keys()];
  }

  kind(id: string): NodeKind {
    return this.kinds.get(id)!;
  }

  private assignKind(id: string, kind: NodeKind): void {
    const current = this.kinds.get(id);
    if (current === undefined || KIND_PRIORITY[kind] < KIND_PRIORITY[current]) {
      this.kinds.set(id, kind);
    }
  }

  private checkAborted(): void {
    if (this.opts.signal?.aborted) throw abortError();
  }

  /** Fetch the root; an inaccessible root is a hard error. */
  async fetchRoot(id: string): Promise<void> {
    this.checkAborted();
    const dto = await this.fetchIssue(id, this.opts.signal);
    this.fetched.set(id, dto);
    this.assignKind(id, 'root');
    this.fetchedCount += 1;
    this.opts.onProgress?.(this.fetchedCount);
  }

  /**
   * Fetch all not-yet-fetched ids with bounded concurrency.
   * Returns ids that were newly fetched AND accessible (candidates for further traversal).
   */
  async fetchMany(ids: string[], kind: NodeKind): Promise<string[]> {
    const pending = [...new Set(ids)].filter((id) => !this.fetched.has(id));
    for (const id of pending) this.assignKind(id, kind);
    const newly: string[] = [];
    let cursor = 0;

    const worker = async (): Promise<void> => {
      while (cursor < pending.length) {
        this.checkAborted();
        if (this.fetchedCount >= this.opts.limit) {
          this.truncated = true;
          return;
        }
        const id = pending[cursor++];
        // Reserve the slot before awaiting so concurrent workers respect the limit.
        this.fetchedCount += 1;
        try {
          const dto = await this.fetchIssue(id, this.opts.signal);
          this.fetched.set(id, dto);
          newly.push(id);
        } catch (err) {
          if (err instanceof IssueNotFoundError) {
            this.fetched.set(id, null);
          } else {
            throw err;
          }
        }
        this.opts.onProgress?.(this.fetchedCount);
      }
    };

    await Promise.all(Array.from({ length: this.opts.concurrency }, worker));
    // Ids skipped because of the limit are simply absent from `fetched`.
    return newly;
  }

  linked(ids: string[], type: 'Subtask' | 'Depend', direction: 'OUTWARD' | 'INWARD'): string[] {
    return ids.flatMap((id) => {
      const dto = this.dto(id);
      return dto ? linkedIds(dto, type, direction) : [];
    });
  }

  toNode(id: string): RoadmapNode {
    const dto = this.dto(id);
    const kind = this.kind(id);
    if (dto) return toRoadmapNode(dto, kind, this.opts.baseUrl);
    return {
      id,
      summary: '(no access)',
      kind,
      resolved: false,
      state: null,
      assignee: null,
      project: id.split('-')[0],
      parentId: null,
      url: issueUrl(this.opts.baseUrl, id),
    };
  }
}

function buildEdges(collector: Collector, nodeIds: Set<string>): RoadmapEdge[] {
  const byKey = new Map<string, RoadmapEdge>();
  const add = (from: string, to: string, kind: EdgeKind): void => {
    if (!nodeIds.has(from) || !nodeIds.has(to) || from === to) return;
    const key = `${from}>${to}`;
    const existing = byKey.get(key);
    // An explicit dependency outranks the implicit hierarchy edge for the same pair.
    if (existing && !(existing.kind === 'subtask' && kind === 'depend')) return;
    byKey.set(key, { from, to, kind });
  };
  for (const id of nodeIds) {
    const dto = collector.dto(id);
    if (!dto) continue;
    for (const prerequisite of linkedIds(dto, 'Depend', 'INWARD')) add(prerequisite, id, 'depend');
    for (const dependent of linkedIds(dto, 'Depend', 'OUTWARD')) add(id, dependent, 'depend');
    /*
     * A parent depends on all of its subtasks. Both ends of the hierarchy are read so the
     * edge survives when one of them is an inaccessible "(no access)" placeholder, which
     * has no links of its own.
     */
    for (const child of linkedIds(dto, 'Subtask', 'OUTWARD')) add(child, id, 'subtask');
    for (const parent of linkedIds(dto, 'Subtask', 'INWARD')) add(id, parent, 'subtask');
  }
  return [...byKey.values()];
}

export function findCycles(nodeIds: Iterable<string>, edges: RoadmapEdge[]): string[][] {
  const adjacency = new Map<string, string[]>();
  for (const id of nodeIds) adjacency.set(id, []);
  for (const e of edges) adjacency.get(e.from)?.push(e.to);

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  const stack: string[] = [];
  const cycles: string[][] = [];
  const seenCycle = new Set<string>();

  const visit = (u: string): void => {
    color.set(u, GRAY);
    stack.push(u);
    for (const v of adjacency.get(u) ?? []) {
      const c = color.get(v) ?? WHITE;
      if (c === GRAY) {
        const cycle = stack.slice(stack.indexOf(v));
        const key = [...cycle].sort().join(',');
        if (!seenCycle.has(key)) {
          seenCycle.add(key);
          cycles.push(cycle);
        }
      } else if (c === WHITE) {
        visit(v);
      }
    }
    stack.pop();
    color.set(u, BLACK);
  };

  for (const id of adjacency.keys()) {
    if ((color.get(id) ?? WHITE) === WHITE) visit(id);
  }
  return cycles;
}

export async function collectRoadmap(
  rootId: string,
  fetchIssue: FetchIssue,
  options: CollectOptions,
): Promise<Roadmap> {
  const collector = new Collector(fetchIssue, {
    baseUrl: options.baseUrl,
    limit: options.limit ?? DEFAULT_LIMIT,
    concurrency: options.concurrency ?? DEFAULT_CONCURRENCY,
    signal: options.signal,
    onProgress: options.onProgress,
  });

  // Phase 1: epic tree via Subtask OUTWARD.
  await collector.fetchRoot(rootId);
  const treeIds: string[] = [rootId];
  let frontier = collector.linked([rootId], 'Subtask', 'OUTWARD');
  while (frontier.length > 0) {
    const newly = await collector.fetchMany(frontier, 'epic');
    treeIds.push(...newly);
    frontier = collector.linked(newly, 'Subtask', 'OUTWARD').filter((id) => !collector.has(id));
  }

  // Phase 2: external prerequisites via Depend INWARD, recursively along Depend INWARD only.
  frontier = collector.linked(treeIds, 'Depend', 'INWARD').filter((id) => !collector.has(id));
  while (frontier.length > 0) {
    const newly = await collector.fetchMany(frontier, 'external-prerequisite');
    frontier = collector.linked(newly, 'Depend', 'INWARD').filter((id) => !collector.has(id));
  }

  // Phase 3: external dependents via Depend OUTWARD, one level, no further traversal.
  const dependents = collector.linked(treeIds, 'Depend', 'OUTWARD').filter((id) => !collector.has(id));
  await collector.fetchMany(dependents, 'external-dependent');

  // Assemble.
  const nodes = new Map<string, RoadmapNode>();
  for (const id of collector.ids()) nodes.set(id, collector.toNode(id));
  const nodeIds = new Set(nodes.keys());
  const edges = buildEdges(collector, nodeIds);

  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
  }
  const orphanIds = [...nodes.values()]
    .filter((n) => (n.kind === 'root' || n.kind === 'epic') && (degree.get(n.id) ?? 0) === 0)
    .map((n) => n.id)
    .sort((a, b) => (a === rootId ? -1 : b === rootId ? 1 : 0));

  return {
    rootId,
    nodes,
    edges,
    orphanIds,
    cycles: findCycles(nodeIds, edges),
    truncated: collector.truncated,
  };
}
