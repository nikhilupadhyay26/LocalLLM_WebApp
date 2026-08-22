import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useWebGPUCheck } from '@/hooks/useWebGPU';
import UnsupportedBrowser from '@/components/onboarding/UnsupportedBrowser';
import FirstRunScreen from '@/components/onboarding/FirstRunScreen';
import AppShell from '@/components/layout/AppShell';
import ChatPanel from '@/components/chat/ChatPanel';

export default function AppPage() {
  const webgpuStatus = useWebGPUCheck();
  const hasEverFailedWebgpu = useAppStore((s) => s.hasEverFailedWebgpu);
  const liteModeAccepted = useAppStore((s) => s.liteModeAccepted);
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const loadDocuments = useAppStore((s) => s.loadDocuments);
  const loadChatSessions = useAppStore((s) => s.loadChatSessions);
  const setActiveChat = useAppStore((s) => s.setActiveChat);
  const updateSessionDocuments = useAppStore((s) => s.updateSessionDocuments);
  const ensureModelLoaded = useAppStore((s) => s.ensureModelLoaded);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    void loadDocuments();
    // Once sessions load, the store may have already restored the last
    // active session id from localStorage; sync the sidebar's document
    // selection to match it, or a reload would otherwise silently drop
    // back to "no documents selected" for a chat that had some.
    void loadChatSessions().then(() => {
      const { activeChatId, chatSessions } = useAppStore.getState();
      const restored = chatSessions.find((c) => c.id === activeChatId);
      if (restored) setSelectedIds(restored.documentIds);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Return visits (onboarding already done, so FirstRunScreen never mounts)
  // still need the model loaded from cache automatically (PRD Section 7,
  // flow 6: "App shell and model load from cache … works offline.").
  useEffect(() => {
    const canLoadModel = webgpuStatus === 'available' || (webgpuStatus === 'unavailable' && liteModeAccepted);
    if (canLoadModel && onboardingComplete) {
      void ensureModelLoaded();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webgpuStatus, liteModeAccepted, onboardingComplete]);

  const toggleDoc = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      // Changing which documents are in scope shouldn't blow away the
      // conversation: update the active chat's own scope so the next
      // message reflects it, instead of forcing a brand new chat.
      const { activeChatId } = useAppStore.getState();
      if (activeChatId) void updateSessionDocuments(activeChatId, next);
      return next;
    });
  };

  const loadSession = (documentIds: string[]) => {
    setSelectedIds(documentIds);
  };

  const startNewChat = () => {
    setActiveChat(null);
    setSelectedIds([]);
  };

  // Only the very first check ever shows the bare loading screen. Once
  // we've seen a failure, UnsupportedBrowser owns its own retry loop and
  // must stay mounted through every subsequent 'checking' status a retry
  // produces, or its retry-count state resets to zero every single cycle
  // (found by testing: the "continue in Lite mode instead" escape hatch
  // could never actually appear, since the count never got the chance to
  // reach its threshold before the component was torn down and rebuilt).
  if (webgpuStatus === 'checking' && !hasEverFailedWebgpu) {
    return <div className="flex min-h-screen items-center justify-center text-muted">Checking your browser…</div>;
  }
  if (webgpuStatus !== 'available' && !liteModeAccepted) {
    return <UnsupportedBrowser />;
  }
  if (!onboardingComplete) {
    return <FirstRunScreen onReady={completeOnboarding} />;
  }

  return (
    <AppShell selectedIds={selectedIds} onToggle={toggleDoc} onLoadSession={loadSession} onNewChat={startNewChat}>
      <ChatPanel selectedDocumentIds={selectedIds} />
    </AppShell>
  );
}
