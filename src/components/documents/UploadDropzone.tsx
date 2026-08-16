import { useRef, useState, type DragEvent } from 'react';
import { useAppStore } from '@/store/useAppStore';

export default function UploadDropzone() {
  const ingestFile = useAppStore((s) => s.ingestFile);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => void ingestFile(file));
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
        dragging ? 'border-signal bg-signal/5' : 'border-ink-700 hover:border-ink-500'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.csv,.tsv,.txt"
        className="sr-only"
        id="file-upload-input"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <label htmlFor="file-upload-input" className="cursor-pointer text-sm text-secondary">
        <span className="text-primary underline underline-offset-2">Upload documents</span> or drag them here
        <div className="mt-1 text-xs text-muted">PDF, DOCX, CSV, TXT (up to 25MB each)</div>
      </label>
    </div>
  );
}
