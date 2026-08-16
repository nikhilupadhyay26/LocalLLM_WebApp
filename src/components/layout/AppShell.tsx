import type { ReactNode } from 'react';
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
  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar selectedIds={selectedIds} onToggle={onToggle} onLoadSession={onLoadSession} onNewChat={onNewChat} />
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
