import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import * as Tooltip from '@radix-ui/react-tooltip';
import type { RoadmapNode } from '../graph/model';
import { NODE_HEIGHT, NODE_WIDTH } from '../graph/layout';
import { borderClass, kindLabel, stateColors } from './nodeStyle';

export interface IssueNodeData extends Record<string, unknown> {
  node: RoadmapNode;
  highlighted: boolean;
}
export type IssueFlowNode = Node<IssueNodeData, 'issue'>;

export function IssueNodeCard({ node, highlighted }: { node: RoadmapNode; highlighted: boolean }) {
  const label = kindLabel(node.kind);
  const colors = stateColors(node);
  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            onClick={() => window.open(node.url, '_blank', 'noopener')}
            style={{ width: NODE_WIDTH, height: NODE_HEIGHT, background: colors.background, color: colors.color }}
            className={[
              'rounded-md px-3 py-2 text-left shadow-sm flex flex-col justify-between cursor-pointer',
              borderClass(node.kind),
              node.resolved ? 'opacity-55' : '',
              highlighted ? 'ring-4 ring-blue-400' : '',
            ].join(' ')}
          >
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
            className="z-50 max-w-sm rounded bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
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

function IssueNodeComponent({ data }: NodeProps<IssueFlowNode>) {
  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-gray-500" />
      <IssueNodeCard node={data.node} highlighted={data.highlighted} />
      <Handle type="source" position={Position.Right} className="!bg-gray-500" />
    </>
  );
}

export const IssueNode = memo(IssueNodeComponent);
