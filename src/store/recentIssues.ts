import type { RecentIssue } from '../auth/storage';

/** How many issues the input's history offers. */
export const MAX_RECENT_ISSUES = 10;

/**
 * The issue moves to the head of the history, keeping the list free of duplicates and
 * no longer than {@link MAX_RECENT_ISSUES}. A summary is only learnt once the build
 * succeeds, so an empty one never overwrites the summary already remembered.
 */
export function rememberIssue(list: RecentIssue[], entry: RecentIssue): RecentIssue[] {
  const known = list.find((i) => i.id === entry.id);
  const head = { id: entry.id, summary: entry.summary || (known?.summary ?? '') };
  return [head, ...list.filter((i) => i.id !== entry.id)].slice(0, MAX_RECENT_ISSUES);
}
