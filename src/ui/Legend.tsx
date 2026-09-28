import { useSettingsStore } from '../store/settingsStore';
import { BUCKET_LABELS, BUCKET_ORDER, BUCKET_STYLES } from './statusBucket';
import { useTheme } from './theme';
import { ChevronDownIcon, InfoIcon } from './icons';

const KIND_ROWS: { cls: string; text: string }[] = [
  { cls: 'border-4 border-solid border-gray-900 dark:border-gray-100', text: 'Epic (root)' },
  { cls: 'border-2 border-solid border-gray-700 dark:border-gray-300', text: 'Issue inside the epic' },
  { cls: 'border-2 border-dashed border-gray-500 dark:border-gray-400', text: 'Prerequisite outside the epic' },
  { cls: 'border-2 border-dotted border-gray-500 dark:border-gray-400', text: 'Dependent outside the epic' },
];

const PANEL_ID = 'legend-panel';

/**
 * Top-right, clear of the zoom controls (bottom-left) and the minimap (bottom-right). Folded, it
 * is just its button; the choice is remembered.
 */
export function Legend() {
  const scheme = useSettingsStore((s) => s.settings.colorScheme);
  const showCriticalPath = useSettingsStore((s) => s.settings.criticalPath);
  const open = useSettingsStore((s) => s.settings.legendOpen);
  const update = useSettingsStore((s) => s.update);
  const theme = useTheme();
  return (
    <aside
      className={`absolute right-3 top-3 z-10 max-w-[calc(100%-1.5rem)] rounded-lg border border-line bg-raised/95 text-xs text-fg shadow-md backdrop-blur-sm ${open ? 'w-72' : ''}`}
    >
      <button
        type="button"
        onClick={() => update({ legendOpen: !open })}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left font-semibold focus-visible:outline-2 focus-visible:outline-focus"
      >
        <InfoIcon size={14} className="text-muted" />
        <span className="flex-1">Legend</span>
        <ChevronDownIcon size={14} className={`text-muted motion-safe:transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={PANEL_ID} className="space-y-3 border-t border-line px-3 pb-3 pt-2">
          <section className="space-y-1">
            {KIND_ROWS.map((r) => (
              <div key={r.text} className="flex items-center gap-2">
                <span className={`inline-block h-4 w-8 shrink-0 rounded bg-surface ${r.cls}`} />
                <span>{r.text}</span>
              </div>
            ))}
          </section>
          <section className="space-y-1">
            <div className="font-semibold text-muted">Status</div>
            {scheme === 'semantic' ? (
              <div className="grid grid-cols-2 gap-1">
                {BUCKET_ORDER.map((bucket) => (
                  <div key={bucket} className="flex items-center gap-2">
                    <span
                      className="inline-block h-4 w-8 shrink-0 overflow-hidden rounded border border-line-strong"
                      style={{ background: BUCKET_STYLES[theme][bucket].background }}
                    >
                      <span className="block h-full w-1.5" style={{ background: BUCKET_STYLES[theme][bucket].accent }} />
                    </span>
                    <span>{BUCKET_LABELS[bucket]}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div>Fill and stripe = YouTrack state colour.</div>
            )}
            {showCriticalPath && (
              <div className="flex items-center gap-2 pt-1">
                <span className="inline-block h-4 w-8 shrink-0 rounded bg-surface outline-2 outline-offset-2 outline-critical" />
                <span>On the critical path</span>
              </div>
            )}
          </section>
          <section className="space-y-0.5 text-muted">
            <div>Resolved issues are faded and ticked.</div>
            <div>Solid arrow: prerequisite → dependent.</div>
            <div>Dashed arrow: subtask → parent (a parent needs all of its subtasks).</div>
            <div>Click a card to open the issue; right-click for more.</div>
          </section>
        </div>
      )}
    </aside>
  );
}
