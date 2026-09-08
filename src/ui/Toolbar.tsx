import * as Switch from '@radix-ui/react-switch';
import { useRoadmapStore } from '../store/roadmapStore';
import { useSettingsStore } from '../store/settingsStore';
import { useCriticalPathStore } from '../store/criticalPathStore';
import type { ColorScheme, ThemePreference } from '../auth/storage';
import { AuthStatus } from './AuthStatus';
import { IssueIdInput } from './IssueIdInput';
import { nextThemePreference } from './theme';

const THEME_ICONS: Record<ThemePreference, string> = { system: '🖥', light: '☀', dark: '☾' };

export function Toolbar({ onOpenSettings, onFitView }: { onOpenSettings(): void; onFitView(): void }) {
  const roadmap = useRoadmapStore((s) => s.roadmap);
  const colorScheme = useSettingsStore((s) => s.settings.colorScheme);
  const theme = useSettingsStore((s) => s.settings.theme);
  const showCriticalPath = useSettingsStore((s) => s.settings.criticalPath);
  const showResolved = useSettingsStore((s) => s.settings.showResolved);
  const criticalCount = useCriticalPathStore((s) => s.ids.size);
  const updateSettings = useSettingsStore((s) => s.update);

  const hidden =
    roadmap && !showResolved
      ? [...roadmap.nodes.values()].filter((n) => n.resolved && n.id !== roadmap.rootId).length
      : 0;

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <IssueIdInput />
      <label className="flex items-center gap-2">
        <Switch.Root
          checked={showResolved}
          onCheckedChange={(checked) => updateSettings({ showResolved: checked })}
          aria-label="Show resolved"
          className="relative h-5 w-9 rounded-full bg-gray-300 data-[state=checked]:bg-blue-600 dark:bg-slate-600"
        >
          <Switch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white transition data-[state=checked]:translate-x-4" />
        </Switch.Root>
        Show resolved
      </label>
      <label className="flex items-center gap-2">
        <Switch.Root
          checked={showCriticalPath}
          onCheckedChange={(checked) => updateSettings({ criticalPath: checked })}
          aria-label="Critical path"
          className="relative h-5 w-9 rounded-full bg-gray-300 data-[state=checked]:bg-amber-500 dark:bg-slate-600"
        >
          <Switch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white transition data-[state=checked]:translate-x-4" />
        </Switch.Root>
        Critical path
      </label>
      <label className="flex items-center gap-2">
        Colours
        <select
          value={colorScheme}
          onChange={(e) => updateSettings({ colorScheme: e.target.value as ColorScheme })}
          className="rounded border px-2 py-1 dark:border-slate-600 dark:bg-slate-800"
        >
          <option value="semantic">Semantic</option>
          <option value="youtrack">YouTrack</option>
        </select>
      </label>
      <button type="button" onClick={onFitView} className="rounded border px-2 py-1 dark:border-slate-600">
        Fit view
      </button>
      {roadmap && (
        <span className="text-gray-500 dark:text-slate-400">
          {roadmap.nodes.size} issues · {hidden} hidden
          {showCriticalPath && ` · ${criticalCount} on critical path`}
        </span>
      )}
      <div className="ml-auto flex items-center gap-3">
        <AuthStatus />
        {/* One button for three states: the label names the current one, a click moves to the next. */}
        <button
          type="button"
          onClick={() => updateSettings({ theme: nextThemePreference(theme) })}
          aria-label={`Theme: ${theme}`}
          title={`Theme: ${theme} — click to switch`}
          className="rounded border px-2 py-1 dark:border-slate-600"
        >
          {THEME_ICONS[theme]}
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
          className="rounded border px-2 py-1 dark:border-slate-600"
        >
          ⚙
        </button>
      </div>
    </header>
  );
}
