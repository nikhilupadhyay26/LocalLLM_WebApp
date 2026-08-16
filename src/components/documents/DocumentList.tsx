import { useAppStore } from '@/store/useAppStore';
import DocumentItem from './DocumentItem';

interface DocumentListProps {
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export default function DocumentList({ selectedIds, onToggle }: DocumentListProps) {
  const documents = useAppStore((s) => s.documents);

  if (documents.length === 0) {
    return <p className="px-2 py-4 text-center text-xs text-muted">No documents yet. Upload something to start.</p>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {documents.map((doc) => (
        <DocumentItem key={doc.id} doc={doc} selected={selectedIds.includes(doc.id)} onToggle={() => onToggle(doc.id)} />
      ))}
    </div>
  );
}
