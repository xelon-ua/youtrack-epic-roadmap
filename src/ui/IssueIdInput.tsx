import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRoadmapStore } from '../store/roadmapStore';
import { useSettingsStore } from '../store/settingsStore';
import type { RecentIssue } from '../auth/storage';

const LISTBOX_ID = 'issue-id-history';
const optionId = (index: number) => `${LISTBOX_ID}-${index}`;

function matches(issue: RecentIssue, query: string): boolean {
  return `${issue.id} ${issue.summary}`.toLowerCase().includes(query);
}

/**
 * The issue id field, with the history of issues built before. Focusing the field offers
 * the whole history; typing narrows it. Picking an entry builds it straight away.
 */
export function IssueIdInput() {
  const { issueId, status, build } = useRoadmapStore();
  const recentIssues = useSettingsStore((s) => s.settings.recentIssues);
  // Nothing built yet in this tab: offer the issue from the previous visit, without building it.
  const [draft, setDraft] = useState(issueId || recentIssues[0]?.id || '');
  // Reset the draft when the store's issue id changes (URL param, OAuth state).
  const [prevIssueId, setPrevIssueId] = useState(issueId);
  const [open, setOpen] = useState(false);
  // The prefilled draft is not a search: the history is only narrowed once something is typed.
  const [typed, setTyped] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  if (issueId !== prevIssueId) {
    setPrevIssueId(issueId);
    setDraft(issueId);
  }

  const query = draft.trim().toLowerCase();
  const shown = typed && query ? recentIssues.filter((i) => matches(i, query)) : recentIssues;
  const listOpen = open && shown.length > 0;

  const pick = (issue: RecentIssue) => {
    setDraft(issue.id);
    setTyped(false);
    setOpen(false);
    setHighlight(-1);
    void build(issue.id);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setOpen(false);
    if (draft.trim()) void build(draft);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setHighlight(-1);
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      if (!listOpen) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setHighlight(Math.min(shown.length - 1, Math.max(-1, highlight + step)));
      return;
    }
    // Enter with nothing highlighted falls through to the form: build whatever was typed.
    if (e.key === 'Enter' && listOpen && highlight >= 0) {
      e.preventDefault();
      pick(shown[highlight]);
    }
  };

  return (
    <form role="form" onSubmit={submit} className="flex items-center gap-2">
      <div className="relative">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setTyped(true);
            setOpen(true);
            setHighlight(-1);
          }}
          onFocus={() => {
            setOpen(true);
            setTyped(false);
            setHighlight(-1);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          placeholder="ACME-102"
          className="w-36 rounded border px-2 py-1 font-mono dark:border-slate-600 dark:bg-slate-800"
          aria-label="Issue ID"
          role="combobox"
          aria-expanded={listOpen}
          aria-controls={LISTBOX_ID}
          aria-autocomplete="list"
          aria-activedescendant={highlight >= 0 ? optionId(highlight) : undefined}
          autoComplete="off"
        />
        {listOpen && (
          <ul
            id={LISTBOX_ID}
            role="listbox"
            aria-label="Recent issues"
            className="absolute left-0 top-full z-20 mt-1 max-h-80 w-96 max-w-[80vw] overflow-y-auto rounded border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
          >
            {shown.map((issue, index) => (
              <li
                key={issue.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === highlight}
                // Selecting on mousedown, before the input's blur closes the list.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(issue);
                }}
                onMouseEnter={() => setHighlight(index)}
                className={`flex cursor-pointer items-baseline gap-2 px-2 py-1 ${
                  index === highlight ? 'bg-blue-50 dark:bg-slate-700' : ''
                }`}
              >
                <span className="shrink-0 font-mono">{issue.id}</span>
                <span className="truncate text-gray-500 dark:text-slate-400">{issue.summary}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="submit"
        disabled={status === 'loading'}
        className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50"
      >
        {status === 'loading' ? 'Building…' : 'Build'}
      </button>
    </form>
  );
}
