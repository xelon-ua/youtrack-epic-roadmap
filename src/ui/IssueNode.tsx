import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import * as Tooltip from '@radix-ui/react-tooltip';
import type { RoadmapNode } from '../graph/model';
import type { ColorScheme } from '../auth/storage';
import { NODE_HEIGHT, NODE_WIDTH } from '../graph/layout';
import { useSettingsStore } from '../store/settingsStore';
import { useIsHighlighted } from '../store/hoverStore';
import { borderClass, kindLabel, nodeColors } from './nodeStyle';
import { useTheme, type Theme } from './theme';

export interface IssueNodeData extends Record<string, unknown> {
  node: RoadmapNode;
}
export type IssueFlowNode = Node<IssueNodeData, 'issue'>;

export function IssueNodeCard({
  node,
  highlighted,
  scheme,
  theme,
}: {
  node: RoadmapNode;
  highlighted: boolean;
  scheme: ColorScheme;
  theme: Theme;
}) {
  const label = kindLabel(node.kind);
  const colors = nodeColors(node, scheme, theme);
  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            onClick={() => window.open(node.url, '_blank', 'noopener')}
            style={{ width: NODE_WIDTH, height: NODE_HEIGHT, background: colors.background, color: colors.color }}
            className={[
              'relative overflow-hidden rounded-md py-2 pl-4 pr-3 text-left shadow-sm flex flex-col justify-between cursor-pointer',
              borderClass(node.kind),
              node.resolved ? 'opacity-70' : '',
              highlighted ? 'ring-4 ring-blue-400' : '',
            ].join(' ')}
          >
            {/* Status accent: the fill alone stops separating cards once the map is zoomed out. */}
            <span
              data-testid="status-stripe"
              aria-hidden="true"
              className="absolute left-0 top-0 h-full w-1.5"
              style={{ background: colors.accent }}
            />
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-semibold">{node.id}</span>
              {label && <span className="rounded bg-black/10 px-1">{label}</span>}
            </div>
            <div className="text-sm leading-tight line-clamp-2">{node.summary}</div>
            <div className="text-[11px] opacity-80">{node.state?.name ?? 'no state'}</div>
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            className="z-50 max-w-sm rounded bg-gray-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-slate-700"
          >
            <div className="font-semibold">
              {node.id}: {node.summary}
            </div>
            <div>State: {node.state?.name ?? '—'}</div>
            <div>Assignee: {node.assignee ?? 'unassigned'}</div>
            <div>Project: {node.project}</div>
            {node.parentId && <div>Parent: {node.parentId}</div>}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

/*
 * Highlighting is read here rather than passed through `data`: a node object that changes makes
 * React Flow re-measure the card, which hides it until the measurement lands.
 */
function IssueNodeComponent({ id, data }: NodeProps<IssueFlowNode>) {
  const scheme = useSettingsStore((s) => s.settings.colorScheme);
  const theme = useTheme();
  const highlighted = useIsHighlighted(id);
  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-gray-500" />
      <IssueNodeCard node={data.node} highlighted={highlighted} scheme={scheme} theme={theme} />
      <Handle type="source" position={Position.Right} className="!bg-gray-500" />
    </>
  );
}

export const IssueNode = memo(IssueNodeComponent);
