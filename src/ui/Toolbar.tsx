import type { ComponentType } from 'react';
import * as Switch from '@radix-ui/react-switch';
import { useRoadmapStore } from '../store/roadmapStore';
import { useSettingsStore } from '../store/settingsStore';
import { useCriticalPathStore } from '../store/criticalPathStore';
import type { ColorScheme, ThemePreference } from '../auth/storage';
import { AuthStatus } from './AuthStatus';
import { IssueIdInput } from './IssueIdInput';
import { nextThemePreference } from './theme';
import { ICON_BUTTON, TEXT_INPUT } from './controls';
import { AppMarkIcon, MonitorIcon, MoonIcon, SettingsIcon, SunIcon } from './icons';

const THEME_ICONS: Record<ThemePreference, ComponentType<{ size?: number }>> = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
};

function ToolbarSwitch({
  label,
  checked,
  onChange,
  checkedClass,
}: {
  label: string;
  checked: boolean;
  onChange(checked: boolean): void;
  /** The track colour when on; the critical path wears its own. */
  checkedClass: string;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2 whitespace-nowrap">
      <Switch.Root
        checked={checked}
        onCheckedChange={onChange}
        aria-label={label}
        className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full bg-line-strong motion-safe:transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${checkedClass}`}
      >
        <Switch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow-sm motion-safe:transition-transform data-[state=checked]:translate-x-4" />
      </Switch.Root>
      {label}
    </label>
  );
}

const DIVIDER = <span aria-hidden="true" className="hidden h-6 w-px bg-line lg:block" />;

export function Toolbar({ onOpenSettings }: { onOpenSettings(): void }) {
  const roadmap = useRoadmapStore((s) => s.roadmap);
  const colorScheme = useSettingsStore((s) => s.settings.colorScheme);
  const theme = useSettingsStore((s) => s.settings.theme);
  const showCriticalPath = useSettingsStore((s) => s.settings.criticalPath);
  const showResolved = useSettingsStore((s) => s.settings.showResolved);
  const epicLinks = useSettingsStore((s) => s.settings.epicLinks);
  const criticalCount = useCriticalPathStore((s) => s.ids.size);
  const updateSettings = useSettingsStore((s) => s.update);
  const ThemeIcon = THEME_ICONS[theme];

  const hidden =
    roadmap && !showResolved
      ? [...roadmap.nodes.values()].filter((n) => n.resolved && n.id !== roadmap.rootId).length
      : 0;

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface px-4 py-2 text-sm text-fg">
      {/* Graph: what to build. */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 font-semibold" title="YouTrack Epic Roadmap">
          <AppMarkIcon size={20} className="text-primary" />
          <span className="hidden lg:inline">Epic Roadmap</span>
        </span>
        <IssueIdInput />
      </div>
      {DIVIDER}
      {/* View: how to show it. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ToolbarSwitch
          label="Show resolved"
          checked={showResolved}
          onChange={(checked) => updateSettings({ showResolved: checked })}
          checkedClass="data-[state=checked]:bg-primary"
        />
        <ToolbarSwitch
          label="Critical path"
          checked={showCriticalPath}
          onChange={(checked) => updateSettings({ criticalPath: checked })}
          checkedClass="data-[state=checked]:bg-critical"
        />
        <ToolbarSwitch
          label="Epic links"
          checked={epicLinks}
          onChange={(checked) => updateSettings({ epicLinks: checked })}
          checkedClass="data-[state=checked]:bg-primary"
        />
        <label className="flex items-center gap-2">
          <span className="text-muted">Colours</span>
          <select
            value={colorScheme}
            onChange={(e) => updateSettings({ colorScheme: e.target.value as ColorScheme })}
            className={`${TEXT_INPUT} cursor-pointer pr-1`}
          >
            <option value="semantic">Semantic</option>
            <option value="youtrack">YouTrack</option>
          </select>
        </label>
        {roadmap && (
          <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs text-muted tabular-nums" aria-live="polite">
            {roadmap.nodes.size} issues · {hidden} hidden
            {showCriticalPath && ` · ${criticalCount} on critical path`}
          </span>
        )}
      </div>
      {/* Account. */}
      <div className="ml-auto flex items-center gap-2">
        <AuthStatus />
        {/* One button for three states: the label names the current one, a click moves to the next. */}
        <button
          type="button"
          onClick={() => updateSettings({ theme: nextThemePreference(theme) })}
          aria-label={`Theme: ${theme}`}
          title={`Theme: ${theme} — click to switch`}
          className={ICON_BUTTON}
        >
          <ThemeIcon size={16} />
        </button>
        <button type="button" onClick={onOpenSettings} aria-label="Settings" title="Settings" className={ICON_BUTTON}>
          <SettingsIcon size={16} />
        </button>
      </div>
    </header>
  );
}
