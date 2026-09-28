import { useState } from 'react';
import type { Roadmap } from '../graph/model';
import { useRoadmapStore } from '../store/roadmapStore';
import { AlertIcon, CloseIcon } from './icons';

/**
 * Warnings about the graph on screen: it was truncated, or it has dependency cycles. They float
 * over the canvas, so the map does not move when they appear or go.
 */
export function StatusBanner() {
  const { status, roadmap } = useRoadmapStore();
  // Dismissal belongs to one graph; the next one gets its own warnings.
  const [dismissed, setDismissed] = useState<Roadmap | null>(null);

  if (status !== 'ready' || !roadmap || dismissed === roadmap) return null;
  if (!roadmap.truncated && roadmap.cycles.length === 0) return null;
  return (
    <div
      role="status"
      className="absolute left-3 top-3 z-10 flex max-w-md gap-2 rounded-lg border border-amber-300 bg-amber-50/95 px-3 py-2 text-sm text-amber-950 shadow-md dark:border-amber-800 dark:bg-amber-950/95 dark:text-amber-100"
    >
      <AlertIcon size={16} className="mt-0.5 shrink-0" />
      <div className="max-h-40 flex-1 space-y-1 overflow-y-auto">
        {roadmap.truncated && <div>Graph truncated: stopped after 500 issues. The map is incomplete.</div>}
        {roadmap.cycles.map((c) => (
          <div key={c.join(',')}>
            Dependency cycle: {c.join(' → ')} → {c[0]}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setDismissed(roadmap)}
        aria-label="Dismiss"
        className="-mr-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-focus dark:hover:bg-white/10"
      >
        <CloseIcon size={14} />
      </button>
    </div>
  );
}
