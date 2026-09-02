import { useSettingsStore } from '../store/settingsStore';
import { BUCKET_LABELS, BUCKET_ORDER, BUCKET_STYLES } from './statusBucket';
import { useTheme } from './theme';

const KIND_ROWS: { cls: string; text: string }[] = [
  { cls: 'border-4 border-solid border-gray-900 dark:border-gray-100', text: 'Epic (root)' },
  { cls: 'border-2 border-solid border-gray-700 dark:border-gray-300', text: 'Issue inside the epic' },
  { cls: 'border-2 border-dashed border-gray-500 dark:border-gray-400', text: 'Prerequisite outside the epic' },
  { cls: 'border-2 border-dotted border-gray-500 dark:border-gray-400', text: 'Dependent outside the epic' },
];

export function Legend() {
  const scheme = useSettingsStore((s) => s.settings.colorScheme);
  const showCriticalPath = useSettingsStore((s) => s.settings.criticalPath);
  const theme = useTheme();
  return (
    <div className="absolute bottom-3 left-3 z-10 rounded bg-white/90 p-3 text-xs text-gray-700 shadow dark:bg-slate-800/90 dark:text-slate-200">
      <div className="mb-1 font-semibold">Legend</div>
      {KIND_ROWS.map((r) => (
        <div key={r.text} className="flex items-center gap-2">
          <span className={`inline-block h-4 w-8 rounded bg-white dark:bg-slate-900 ${r.cls}`} />
          <span>{r.text}</span>
        </div>
      ))}
      <div className="mb-1 mt-2 font-semibold">Status</div>
      {scheme === 'semantic' ? (
        BUCKET_ORDER.map((bucket) => (
          <div key={bucket} className="flex items-center gap-2">
            <span
              className="inline-block h-4 w-8 overflow-hidden rounded border border-gray-300 dark:border-slate-600"
              style={{ background: BUCKET_STYLES[theme][bucket].background }}
            >
              <span className="block h-full w-1.5" style={{ background: BUCKET_STYLES[theme][bucket].accent }} />
            </span>
            <span>{BUCKET_LABELS[bucket]}</span>
          </div>
        ))
      ) : (
        <div>Fill and stripe = YouTrack state colour.</div>
      )}
      {showCriticalPath && (
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-block h-4 w-8 rounded bg-white outline-2 outline-offset-2 outline-amber-500 dark:bg-slate-900" />
          <span>On the critical path</span>
        </div>
      )}
      <div className="mt-1">Resolved issues are faded.</div>
      <div>Solid arrow: prerequisite → dependent.</div>
      <div>Dashed arrow: subtask → parent (a parent needs all of its subtasks).</div>
      <div>Click a card to open the issue.</div>
    </div>
  );
}
