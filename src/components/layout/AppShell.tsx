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
    <div className="flex h-screen flex-col">
      <TopBar onMenuClick={() => setSidebarOpen(true)} />
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
