import { useAuthStore, authMode } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRoadmapStore } from '../store/roadmapStore';
import { startLogin } from '../auth/session';

export function AuthStatus() {
  const user = useAuthStore((s) => s.user);
  // Subscribing to the token makes the component re-render when it changes.
  useAuthStore((s) => s.token);
  const signOut = useAuthStore((s) => s.signOut);
  const settings = useSettingsStore((s) => s.settings);
  const issueId = useRoadmapStore((s) => s.issueId);
  const mode = authMode();

  if (mode === 'permanent-token') {
    return <span className="text-gray-600">token · {user?.login ?? '…'}</span>;
  }
  if (mode === 'oauth') {
    return (
      <span className="flex items-center gap-2 text-gray-600">
        {user?.fullName ?? user?.login ?? 'signed in'}
        <button type="button" onClick={signOut} className="underline">
          Sign out
        </button>
      </span>
    );
  }
  const canLogin = settings.baseUrl.trim() !== '' && settings.clientId.trim() !== '';
  return (
    <button
      type="button"
      disabled={!canLogin}
      title={canLogin ? undefined : 'Set YouTrack URL and OAuth client ID in Settings'}
      onClick={() => startLogin(issueId || null)}
      className="rounded bg-gray-900 px-3 py-1 text-white disabled:opacity-40"
    >
      Sign in with YouTrack
    </button>
  );
}
