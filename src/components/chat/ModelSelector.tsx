import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { DEFAULT_MODEL_ID, MODEL_LABEL, getModelCatalog, getModelDisplayName, isModelCached } from '@/lib/llm';
import { LITE_MODEL_LABEL } from '@/lib/liteLlm';
import Modal from '@/components/common/Modal';
import ModelDownloadReassurances from '@/components/common/ModelDownloadReassurances';
import ModelDownloadProgressBar from '@/components/common/ModelDownloadProgressBar';

interface CatalogRow {
  id: string;
  displayName: string;
  sizeLabel: string;
  cached: boolean;
}

export default function ModelSelector() {
  const modelId = useAppStore((s) => s.modelId);
  const setModelId = useAppStore((s) => s.setModelId);
  const modelProgress = useAppStore((s) => s.modelProgress);
  const modelSwitchError = useAppStore((s) => s.modelSwitchError);
  const dismissModelSwitchError = useAppStore((s) => s.dismissModelSwitchError);
  const webgpuStatus = useAppStore((s) => s.webgpuStatus);
  const liteModeAccepted = useAppStore((s) => s.liteModeAccepted);
  const lite = webgpuStatus !== 'available' || liteModeAccepted;

  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [rows, setRows] = useState<CatalogRow[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLabel = modelId === DEFAULT_MODEL_ID ? MODEL_LABEL : getModelDisplayName(modelId);

  // Cache status is checked fresh each time the list opens rather than once
  // up front: it can change between opens (e.g. right after a download).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const catalog = getModelCatalog();
      const withCacheStatus = await Promise.all(
        catalog.map(async (m) => ({ ...m, cached: await isModelCached(m.id) })),
      );
      if (!cancelled) setRows(withCacheStatus);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const selectModel = async (id: string) => {
    setOpen(false);
    if (id === modelId) return;
    setSwitching(true);
    await setModelId(id);
    setSwitching(false);
  };

  // Lite mode has exactly one model, no catalog to pick from, so the picker
  // becomes a plain status tag instead of a dropdown.
  if (lite) {
    return (
      <div className="px-3 pt-2">
        <span className="mono-tag text-secondary">{LITE_MODEL_LABEL}</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative px-3 pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mono-tag inline-flex items-center gap-1 text-secondary hover:text-primary"
        aria-expanded={open}
      >
        {currentLabel} <span aria-hidden="true">▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Choose a model"
          className="card absolute bottom-full left-3 z-20 mb-1 max-h-80 w-80 overflow-y-auto p-2 shadow-xl"
        >
          {rows === null ? (
            <p className="p-2 text-xs text-muted">Loading model list…</p>
          ) : (
            rows.map((row) => (
              <button
                key={row.id}
                type="button"
                role="option"
                aria-selected={row.id === modelId}
                onClick={() => void selectModel(row.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-ink-800 ${
                  row.id === modelId ? 'bg-signal/10 text-primary' : 'text-secondary'
                }`}
              >
                <span className="truncate">{row.displayName}</span>
                <span className="mono-tag shrink-0 text-muted">{row.cached ? 'Cached' : row.sizeLabel}</span>
              </button>
            ))
          )}
        </div>
      )}

      {modelSwitchError && (
        <div className="mb-2 flex items-start justify-between gap-2 rounded-md border border-amber-700/40 bg-amber-950/30 px-2 py-1.5 text-xs text-amber-200">
          <span>{modelSwitchError}</span>
          <button type="button" onClick={dismissModelSwitchError} className="shrink-0" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      <Modal open={switching} onClose={() => {}} title="Switching model" dismissible={false}>
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Loading your selected model. This only takes a moment if it's already been downloaded before.
          </p>
          <ModelDownloadReassurances />
          <ModelDownloadProgressBar progress={modelProgress} />
        </div>
      </Modal>
    </div>
  );
}
