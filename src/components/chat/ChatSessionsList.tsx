import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { ChatSession } from '@/types';

interface ChatSessionsListProps {
  onLoadSession: (documentIds: string[]) => void;
  onNewChat: () => void;
}

function formatRelativeTime(ms: number): string {
  if (!ms || Number.isNaN(ms)) return ''; // sessions saved before `updatedAt` existed
  const diffSec = Math.round((Date.now() - ms) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function sessionLabel(session: ChatSession): string {
  return session.title ?? 'New chat';
}

function SessionRow({
  session,
  active,
  onSelect,
}: {
  session: ChatSession;
  active: boolean;
  onSelect: () => void;
}) {
  const renameSession = useAppStore((s) => s.renameSession);
  const deleteSession = useAppStore((s) => s.deleteSession);
  const [renaming, setRenaming] = useState(false);
  // Deliberately not initialized from `session` here: useState's initializer
  // only runs on first mount, so it would go stale the moment auto-titling
  // (or any other rename) changed session.title later in this row's life.
  // Set fresh from the current session right when rename mode starts instead.
  const [draftTitle, setDraftTitle] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const saveRename = () => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== session.title) void renameSession(session.id, trimmed);
    setRenaming(false);
  };

  if (confirmingDelete) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-xs">
        <span className="text-secondary">Delete this chat?</span>
        <span className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => void deleteSession(session.id)}
            className="rounded bg-red-700 px-2 py-1 text-white hover:bg-red-600"
          >
            Delete
          </button>
          <button type="button" onClick={() => setConfirmingDelete(false)} className="btn-ghost !px-2 !py-1">
            Cancel
          </button>
        </span>
      </div>
    );
  }

  if (renaming) {
    return (
      <input
        autoFocus
        className="input !py-1 text-sm"
        value={draftTitle}
        onChange={(e) => setDraftTitle(e.target.value)}
        onBlur={saveRename}
        onKeyDown={(e) => {
          if (e.key === 'Enter') saveRename();
          if (e.key === 'Escape') {
            setDraftTitle(sessionLabel(session));
            setRenaming(false);
          }
        }}
      />
    );
  }

  return (
    <div className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm ${active ? 'bg-signal/10' : 'hover:bg-ink-800'}`}>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <span className={`block truncate ${active ? 'text-primary' : 'text-secondary'}`}>{sessionLabel(session)}</span>
        <span className="mono-tag">{formatRelativeTime(session.updatedAt)}</span>
      </button>
      <span className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => {
            setDraftTitle(sessionLabel(session));
            setRenaming(true);
          }}
          className="px-1 text-muted hover:text-primary"
          aria-label={`Rename ${sessionLabel(session)}`}
          title="Rename"
        >
          ✎
        </button>
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="px-1 text-muted hover:text-red-400"
          aria-label={`Delete ${sessionLabel(session)}`}
          title="Delete"
        >
          ✕
        </button>
      </span>
    </div>
  );
}

export default function ChatSessionsList({ onLoadSession, onNewChat }: ChatSessionsListProps) {
  const chatSessions = useAppStore((s) => s.chatSessions);
  const activeChatId = useAppStore((s) => s.activeChatId);
  const setActiveChat = useAppStore((s) => s.setActiveChat);

  const selectSession = (session: ChatSession) => {
    setActiveChat(session.id);
    onLoadSession(session.documentIds);
  };

  return (
    <div className="flex max-h-64 flex-col">
      <div className="flex items-center justify-between px-2">
        <p className="mono-tag">Chats</p>
        <button type="button" onClick={onNewChat} className="btn-ghost !px-1.5 !py-0.5 text-xs">
          + New
        </button>
      </div>
      <div className="mt-1 flex-1 space-y-0.5 overflow-y-auto">
        {chatSessions.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted">No chats yet.</p>
        ) : (
          chatSessions.map((session) => (
            <SessionRow key={session.id} session={session} active={session.id === activeChatId} onSelect={() => selectSession(session)} />
          ))
        )}
      </div>
    </div>
  );
}
