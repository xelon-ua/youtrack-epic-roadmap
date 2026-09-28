import type { ReactNode } from 'react';
import { useRoadmapStore } from '../store/roadmapStore';
import { useSettingsStore } from '../store/settingsStore';
import { authMode, useAuthStore } from '../store/authStore';
import { startLogin } from '../auth/session';
import { describeError } from './errorText';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from './controls';
import { AlertIcon, AppMarkIcon, CheckIcon, SpinnerIcon } from './icons';

function Card({ children, role }: { children: ReactNode; role?: string }) {
  return (
    <div role={role} className="w-full max-w-md rounded-xl border border-line bg-raised p-6 text-sm text-fg shadow-sm">
      {children}
    </div>
  );
}

function Step({ n, done, current, title, children }: {
  n: number;
  done: boolean;
  current: boolean;
  title: string;
  children?: ReactNode;
}) {
  return (
    <li className="flex gap-3" aria-current={current ? 'step' : undefined}>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          done ? 'bg-primary text-primary-fg' : current ? 'border-2 border-primary text-primary' : 'border border-line-strong text-muted'
        }`}
      >
        {done ? <CheckIcon size={14} /> : n}
        <span className="sr-only">{done ? ' (done)' : ''}</span>
      </span>
      <div className={`space-y-2 pt-0.5 ${done || current ? '' : 'text-muted'}`}>
        <div className={current ? 'font-semibold' : ''}>{title}</div>
        {current && children}
      </div>
    </li>
  );
}

/**
 * What the canvas shows while there is no graph: how to get to the first one, the build in
 * progress, or why the last build failed. It stands where the graph will be, so nothing shifts.
 */
export function CanvasMessage({ onOpenSettings }: { onOpenSettings(): void }) {
  const { status, progress, error, issueId, cancel } = useRoadmapStore();
  const settings = useSettingsStore((s) => s.settings);
  // Subscribing to the token makes the component re-render when it changes.
  useAuthStore((s) => s.token);

  let body: ReactNode;
  if (status === 'loading') {
    body = (
      <Card role="status">
        <div className="flex items-center gap-3">
          <SpinnerIcon size={20} className="text-primary" />
          <div className="flex-1">
            <div className="font-semibold">Building {issueId}…</div>
            <div className="text-muted tabular-nums">Fetched {progress} issues…</div>
          </div>
          <button type="button" onClick={cancel} className={SECONDARY_BUTTON}>
            Cancel
          </button>
        </div>
      </Card>
    );
  } else if (status === 'error' && error) {
    const text = describeError(error);
    body = (
      <Card role="alert">
        <div className="flex gap-3">
          <AlertIcon size={20} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
          <div className="space-y-2">
            <div className="font-semibold">{text.title}</div>
            {text.hint && <p className="text-muted">{text.hint}</p>}
            {text.action === 'sign-in' && (
              <button type="button" onClick={() => startLogin(issueId || null)} className={PRIMARY_BUTTON}>
                Sign in with YouTrack
              </button>
            )}
            {text.action === 'settings' && (
              <button type="button" onClick={onOpenSettings} className={SECONDARY_BUTTON}>
                Open Settings
              </button>
            )}
          </div>
        </div>
      </Card>
    );
  } else {
    const mode = authMode();
    const connected = settings.baseUrl.trim() !== '';
    const signedIn = mode !== 'none';
    const canLogin = connected && settings.clientId.trim() !== '';
    body = (
      <Card>
        <div className="mb-4 flex items-center gap-3">
          <AppMarkIcon size={28} className="text-primary" />
          <div>
            <h1 className="text-base font-semibold">YouTrack Epic Roadmap</h1>
            <p className="text-muted">Every subtask and dependency of an epic, laid out as a map.</p>
          </div>
        </div>
        <ol className="space-y-3">
          <Step n={1} done={connected} current={!connected} title="Connect to your YouTrack">
            <button type="button" onClick={onOpenSettings} className={PRIMARY_BUTTON}>
              Open Settings
            </button>
          </Step>
          <Step n={2} done={signedIn} current={connected && !signedIn} title="Sign in">
            {canLogin ? (
              <button type="button" onClick={() => startLogin(null)} className={PRIMARY_BUTTON}>
                Sign in with YouTrack
              </button>
            ) : (
              <p className="text-muted">
                Add an OAuth client ID or a permanent token in{' '}
                <button type="button" onClick={onOpenSettings} className="font-medium text-primary underline">
                  Settings
                </button>
                .
              </p>
            )}
          </Step>
          <Step n={3} done={false} current={connected && signedIn} title="Enter an epic id above and press Build">
            <p className="text-muted">Your ten most recent issues drop down from the id field.</p>
          </Step>
        </ol>
      </Card>
    );
  }
  return <div className="flex h-full items-center justify-center p-4">{body}</div>;
}
