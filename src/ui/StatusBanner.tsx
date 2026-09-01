import { useRoadmapStore } from '../store/roadmapStore';
import { describeError } from './errorText';
import { startLogin } from '../auth/session';

export function StatusBanner({ onOpenSettings }: { onOpenSettings(): void }) {
  const { status, progress, error, roadmap, issueId, cancel } = useRoadmapStore();

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 text-sm text-blue-900">
        <span>Fetched {progress} issues…</span>
        <button type="button" onClick={cancel} className="underline">
          Cancel
        </button>
      </div>
    );
  }
  if (status === 'error' && error) {
    const text = describeError(error);
    return (
      <div className="space-y-1 bg-red-50 px-4 py-2 text-sm text-red-900" role="alert">
        <div className="font-semibold">{text.title}</div>
        {text.hint && <div>{text.hint}</div>}
        {text.action === 'sign-in' && (
          <button type="button" onClick={() => startLogin(issueId || null)} className="underline">
            Sign in with YouTrack
          </button>
        )}
        {text.action === 'settings' && (
          <button type="button" onClick={onOpenSettings} className="underline">
            Open Settings
          </button>
        )}
      </div>
    );
  }
  if (status === 'ready' && roadmap && (roadmap.truncated || roadmap.cycles.length > 0)) {
    return (
      <div className="space-y-1 bg-amber-50 px-4 py-2 text-sm text-amber-900">
        {roadmap.truncated && <div>Graph truncated: stopped after 500 issues. The map is incomplete.</div>}
        {roadmap.cycles.map((c) => (
          <div key={c.join(',')}>
            Dependency cycle: {c.join(' → ')} → {c[0]}
          </div>
        ))}
      </div>
    );
  }
  return null;
}
