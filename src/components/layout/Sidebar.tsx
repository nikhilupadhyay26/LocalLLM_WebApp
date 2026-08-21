import { useAppStore } from '@/store/useAppStore';
import UploadDropzone from '@/components/documents/UploadDropzone';
import DocumentList from '@/components/documents/DocumentList';
import ChatSessionsList from '@/components/chat/ChatSessionsList';

interface SidebarProps {
  selectedIds: string[];
  onToggle: (id: string) => void;
  onLoadSession: (documentIds: string[]) => void;
  onNewChat: () => void;
  /** Only meaningful below the md breakpoint, where the sidebar is a drawer instead of always-visible. */
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ selectedIds, onToggle, onLoadSession, onNewChat, open, onClose }: SidebarProps) {
  const uploadErrors = useAppStore((s) => s.uploadErrors);
  const dismissUploadError = useAppStore((s) => s.dismissUploadError);

  return (
    <>
      {/* Backdrop: mobile-only, and only while the drawer is open. */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 shrink-0 flex-col overflow-y-auto border-r border-ink-800 bg-ink-950 p-3 md:static md:z-auto md:flex ${
          open ? 'flex' : 'hidden'
        }`}
      >
        <ChatSessionsList onLoadSession={onLoadSession} onNewChat={onNewChat} />

        <div className="mt-3 border-t border-ink-800 pt-3">
          <UploadDropzone />
        </div>

        {uploadErrors.length > 0 && (
          <div className="mt-2 space-y-1">
            {uploadErrors.map((err, i) => (
              <div key={i} className="flex items-start justify-between gap-2 rounded-md border border-red-800/40 bg-red-950/30 px-2 py-1.5 text-xs text-red-300">
                <span>{err}</span>
                <button type="button" onClick={() => dismissUploadError(i)} aria-label="Dismiss" className="shrink-0">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3">
          <p className="mono-tag mb-1 px-2">Documents</p>
          <DocumentList selectedIds={selectedIds} onToggle={onToggle} />
        </div>
      </aside>
    </>
  );
}
