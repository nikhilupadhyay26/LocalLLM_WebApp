import type { DocumentRecord } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { buildSupportMailto } from '@/lib/support';

const STATUS_LABEL: Record<DocumentRecord['status'], string> = {
  parsing: 'Reading…',
  embedding: 'Indexing…',
  ready: 'Ready',
  error: 'Error',
};

interface DocumentItemProps {
  doc: DocumentRecord;
  selected: boolean;
  onToggle: () => void;
}

export default function DocumentItem({ doc, selected, onToggle }: DocumentItemProps) {
  const removeDocument = useAppStore((s) => s.removeDocument);
  const busy = doc.status === 'parsing' || doc.status === 'embedding';

  return (
    <div
      className={`group flex items-start gap-2 rounded-md px-2 py-2 text-sm ${
        selected ? 'bg-signal/10' : 'hover:bg-ink-800'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={doc.status !== 'ready'}
        className="flex flex-1 items-start gap-2 text-left disabled:cursor-not-allowed"
        aria-pressed={selected}
      >
        <input
          type="checkbox"
          checked={selected}
          disabled={doc.status !== 'ready'}
          readOnly
          className="mt-1"
          aria-hidden="true"
          tabIndex={-1}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-primary">{doc.filename}</span>
          <span
            className={`mono-tag ${
              doc.status === 'error' ? 'text-red-400' : busy ? 'text-muted' : 'text-signal-dim'
            }`}
          >
            {doc.status === 'embedding' && doc.embedProgress
              ? `Indexing… ${doc.embedProgress.completed}/${doc.embedProgress.total}`
              : STATUS_LABEL[doc.status]}
          </span>
          {doc.status === 'error' && doc.errorMessage && (
            <span className="mt-0.5 block text-xs text-red-400">
              {doc.errorMessage}{' '}
              <a href={buildSupportMailto('PouchLM: document failed to process')} className="underline">
                Need help?
              </a>
            </span>
          )}
        </span>
      </button>
      <button
        type="button"
        onClick={() => void removeDocument(doc.id)}
        className="opacity-0 transition-opacity group-hover:opacity-100 text-muted hover:text-red-400"
        aria-label={`Remove ${doc.filename}`}
        title="Remove"
      >
        ✕
      </button>
    </div>
  );
}
