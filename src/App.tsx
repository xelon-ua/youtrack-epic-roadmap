import { useEffect, useRef, useState } from 'react';
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';
import { Toolbar } from './ui/Toolbar';
import { RoadmapCanvas } from './ui/RoadmapCanvas';
import { Legend } from './ui/Legend';
import { SettingsDialog } from './ui/SettingsDialog';
import { StatusBanner } from './ui/StatusBanner';
import { useRoadmapStore } from './store/roadmapStore';
import { useSettingsStore } from './store/settingsStore';
import { useAuthStore, getAccessToken } from './store/authStore';
import { handleOAuthCallback, loadCurrentUser, scheduleRefresh } from './auth/session';
import { ThemeProvider } from './ui/ThemeProvider';
import { issueFromUrl, writeIssueToUrl } from './ui/issueUrl';

function Shell() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { roadmap, issueId, build, setIssueId } = useRoadmapStore();
  const showResolved = useSettingsStore((s) => s.settings.showResolved);
  const token = useAuthStore((s) => s.token);
  const { fitView } = useReactFlow();
  const booted = useRef(false);

  // Boot: consume an OAuth callback if present, then build the issue from state or URL.
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const callback = handleOAuthCallback();
    const initial = callback?.issueId ?? issueFromUrl();
    if (initial) {
      setIssueId(initial);
      if (getAccessToken()) void build(initial);
    }
  }, [build, setIssueId]);

  useEffect(() => writeIssueToUrl(issueId), [issueId]);

  // Graphs built from a card's menu are history entries: Back and Forward rebuild the one returned to.
  useEffect(() => {
    const onPopState = () => {
      const id = issueFromUrl();
      if (!id) return;
      setIssueId(id);
      if (getAccessToken()) void build(id);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [build, setIssueId]);

  // Whenever the token changes: (re)load the user and arm the silent refresh.
  useEffect(() => {
    void loadCurrentUser();
    return scheduleRefresh();
  }, [token]);

  return (
    <div className="flex h-full flex-col bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100">
      <Toolbar onOpenSettings={() => setSettingsOpen(true)} onFitView={() => void fitView({ padding: 0.1 })} />
      <StatusBanner onOpenSettings={() => setSettingsOpen(true)} />
      <main className="relative flex-1">
        {roadmap ? (
          <>
            <RoadmapCanvas roadmap={roadmap} showResolved={showResolved} />
            <Legend />
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500 dark:text-slate-400">
            YouTrack Epic Roadmap
          </div>
        )}
      </main>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ReactFlowProvider>
        <Shell />
      </ReactFlowProvider>
    </ThemeProvider>
  );
}
