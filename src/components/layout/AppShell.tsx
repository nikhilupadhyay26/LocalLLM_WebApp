import { useState, type ReactNode } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';

interface AppShellProps {
  selectedIds: string[];
  onToggle: (id: string) => void;
  onLoadSession: (documentIds: string[]) => void;
  onNewChat: () => void;
  children: ReactNode;
}

export default function AppShell({ selectedIds, onToggle, onLoadSession, onNewChat, children }: AppShellProps) {
  // Below the md breakpoint the sidebar is a drawer (see Sidebar.tsx), off
  // by default so the chat itself is what actually opens on mobile.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    // h-dvh, not h-screen: 100vh on mobile browsers is measured against the
    // viewport with the address bar hidden, taller than what's actually
    // visible once it's shown, which was pushing the composer below the
    // fold and forcing a scroll to reach it. 100dvh tracks the real visible
    // height as the browser chrome shows/hides.
    <div className="flex h-dvh flex-col">
      <TopBar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((o) => !o)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          selectedIds={selectedIds}
          onToggle={onToggle}
          onLoadSession={(documentIds) => {
            onLoadSession(documentIds);
            setSidebarOpen(false);
          }}
          onNewChat={() => {
            onNewChat();
            setSidebarOpen(false);
          }}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
