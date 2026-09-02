import { create } from 'zustand';

const EMPTY: ReadonlySet<string> = new Set();

interface CriticalPathState {
  /** Issues currently drawn as critical; empty while the toolbar switch is off. */
  ids: ReadonlySet<string>;
  setCriticalPath(ids: ReadonlySet<string>): void;
}

/**
 * Kept out of the React Flow node objects for the same reason as the hover state: folding it
 * into `node.data` would rebuild every card whenever the switch flips, and React Flow would
 * hide the whole graph until each one is measured again. The cards subscribe here instead,
 * and the toolbar reads the count from the same place.
 */
export const useCriticalPathStore = create<CriticalPathState>()((set) => ({
  ids: EMPTY,
  setCriticalPath(ids) {
    set({ ids });
  },
}));

export function useIsCritical(id: string): boolean {
  return useCriticalPathStore((s) => s.ids.has(id));
}
