import { create } from 'zustand';

const EMPTY: ReadonlySet<string> = new Set();

interface HoverState {
  hoveredId: string | null;
  /** The hovered node plus its direct neighbours — everything drawn as highlighted. */
  highlighted: ReadonlySet<string>;
  setHovered(id: string | null, highlighted?: ReadonlySet<string>): void;
}

/**
 * Hover lives outside the React Flow node objects on purpose. React Flow only keeps a node's
 * measured size while the node object stays referentially identical, so folding the hover state
 * into `node.data` would rebuild every node on every mouse move — blanking the graph until each
 * card is measured again. Nodes read this store instead, and their objects never change.
 */
export const useHoverStore = create<HoverState>()((set) => ({
  hoveredId: null,
  highlighted: EMPTY,
  setHovered(hoveredId, highlighted = EMPTY) {
    set({ hoveredId, highlighted });
  },
}));

export function useIsHighlighted(id: string): boolean {
  return useHoverStore((s) => s.highlighted.has(id));
}
