import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import type { RoadmapNode } from '../graph/model';
import type { ColorScheme } from '../auth/storage';
import { NODE_HEIGHT, NODE_WIDTH } from '../graph/layout';
import { useRoadmapStore } from '../store/roadmapStore';
import { useSettingsStore } from '../store/settingsStore';
import { useIsHighlighted } from '../store/hoverStore';
import { useIsCritical } from '../store/criticalPathStore';
import { graphUrl, pushIssueToUrl } from './issueUrl';
import { borderClass, kindLabel, nodeColors } from './nodeStyle';
import { useTheme, type Theme } from './theme';
import { CheckIcon } from './icons';

export interface IssueNodeData extends Record<string, unknown> {
  node: RoadmapNode;
}
export type IssueFlowNode = Node<IssueNodeData, 'issue'>;

export function IssueNodeCard({
  node,
  highlighted,
  critical,
  scheme,
  theme,
}: {
  node: RoadmapNode;
  highlighted: boolean;
  critical: boolean;
  scheme: ColorScheme;
  theme: Theme;
}) {
  const label = kindLabel(node.kind);
  const colors = nodeColors(node, scheme, theme);
  const openIssue = () => window.open(node.url, '_blank', 'noopener');
  return (
    <ContextMenu.Root>
      <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
          <ContextMenu.Trigger asChild>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                onClick={openIssue}
                style={{ width: NODE_WIDTH, height: NODE_HEIGHT, background: colors.background, color: colors.color }}
                className={[
                  // Rows stack from the top rather than spreading out, so the summary always keeps its two lines.
                  'relative flex cursor-pointer flex-col overflow-hidden rounded-md py-2 pl-4 pr-3 text-left shadow-sm',
                  'motion-safe:transition-shadow focus-visible:ring-4 focus-visible:ring-focus',
                  borderClass(node.kind),
                  node.resolved ? 'opacity-70' : '',
                  // Violet, not blue: blue already means "In progress".
                  highlighted ? 'ring-4 ring-hover/70' : '',
                  // An outline rather than a ring, so a hovered or focused card can carry both marks at once.
                  critical ? 'outline-2 outline-offset-2 outline-critical' : 'focus-visible:outline-none',
                ].join(' ')}
              >
                {/* Status accent: the fill alone stops separating cards once the map is zoomed out. */}
                <span
                  data-testid="status-stripe"
                  aria-hidden="true"
                  className="absolute left-0 top-0 h-full w-1.5"
                  style={{ background: colors.accent }}
                />
                <span className="flex shrink-0 items-center justify-between gap-2 font-mono text-xs">
                  <span className="truncate font-semibold">{node.id}</span>
                  {label && <span className="shrink-0 rounded bg-black/10 px-1 dark:bg-white/10">{label}</span>}
                </span>
                <span className="line-clamp-2 shrink-0 text-[13px] leading-[1.3]">{node.summary}</span>
                <span className="mt-auto flex shrink-0 items-center gap-1 truncate text-xs opacity-80">
                  {/* Done is not told by the green fill alone. */}
                  {node.resolved && <CheckIcon size={12} className="shrink-0" />}
                  {node.state?.name ?? 'no state'}
                </span>
              </button>
            </Tooltip.Trigger>
          </ContextMenu.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="top"
              sideOffset={6}
              className="z-50 max-w-sm space-y-0.5 rounded-md bg-slate-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-slate-700"
            >
              <div className="font-semibold">
                {node.id}: {node.summary}
              </div>
              <div>State: {node.state?.name ?? '—'}</div>
              <div>Assignee: {node.assignee ?? 'unassigned'}</div>
              <div>Project: {node.project}</div>
              {node.parentId && <div>Parent: {node.parentId}</div>}
              <div className="pt-1 text-slate-300">Right-click or Shift+F10 for more actions</div>
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
      <ContextMenu.Portal>
        <ContextMenu.Content className="z-50 min-w-48 rounded-md border border-line bg-raised py-1 text-sm text-fg shadow-lg">
          <ContextMenu.Item className={MENU_ITEM_CLASS} onSelect={openIssue}>
            Open in YouTrack
          </ContextMenu.Item>
          {/* The root's graph is the one on screen already. */}
          <ContextMenu.Item
            className={MENU_ITEM_CLASS}
            disabled={node.kind === 'root'}
            onSelect={() => buildGraphHere(node.id)}
          >
            Build graph for this issue
          </ContextMenu.Item>
          {/* No `noopener`: a new tab only gets a copy of the sessionStorage token from its opener. */}
          <ContextMenu.Item className={MENU_ITEM_CLASS} onSelect={() => window.open(graphUrl(node.id), '_blank')}>
            Build graph in new window
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

const MENU_ITEM_CLASS =
  'cursor-pointer select-none px-3 py-1.5 outline-none data-[highlighted]:bg-primary data-[highlighted]:text-primary-fg data-[disabled]:cursor-default data-[disabled]:opacity-50';

/** Swaps the map for `issueId`'s graph, leaving the current one a Back away. */
function buildGraphHere(issueId: string): void {
  pushIssueToUrl(issueId);
  void useRoadmapStore.getState().build(issueId);
}

/*
 * Highlighting is read here rather than passed through `data`: a node object that changes makes
 * React Flow re-measure the card, which hides it until the measurement lands.
 */
function IssueNodeComponent({ id, data }: NodeProps<IssueFlowNode>) {
  const scheme = useSettingsStore((s) => s.settings.colorScheme);
  const theme = useTheme();
  const highlighted = useIsHighlighted(id);
  const critical = useIsCritical(id);
  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-gray-500" />
      <IssueNodeCard node={data.node} highlighted={highlighted} critical={critical} scheme={scheme} theme={theme} />
      <Handle type="source" position={Position.Right} className="!bg-gray-500" />
    </>
  );
}

export const IssueNode = memo(IssueNodeComponent);
