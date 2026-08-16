import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { isMeteredConnection } from '@/lib/webgpu';
import { SUPPORT_BLURB } from '@/lib/support';
import { MODEL_LABEL, MODEL_SIZE } from '@/lib/llm';

export default function FirstRunScreen({ onReady }: { onReady: () => void }) {
  const modelProgress = useAppStore((s) => s.modelProgress);
  const modelReady = useAppStore((s) => s.modelReady);
  const ensureModelLoaded = useAppStore((s) => s.ensureModelLoaded);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metered] = useState(isMeteredConnection);

  useEffect(() => {
    if (modelReady) {
      const t = setTimeout(onReady, 400);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelReady]);

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      await ensureModelLoaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the model.');
      setStarting(false);
    }
  };

  const pct = modelProgress ? Math.round(modelProgress.progress * 100) : 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="card w-full max-w-lg p-8">
        <p className="mono-tag mb-3">One-time setup</p>
        <h1 className="mb-3 text-xl font-medium text-primary">
          Downloading the {MODEL_LABEL} ({MODEL_SIZE})
        </h1>
        <p className="mb-6 text-sm text-secondary">
          This happens once. After this, LocalDesk works instantly, even offline. Nothing ever leaves your device.
        </p>

        {metered && !starting && (
          <p className="mb-4 rounded-md border border-amber-700/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-300">
            You appear to be on a metered or cellular connection. We'd recommend Wi-Fi for this download.
          </p>
        )}

        {!starting && (
          <button type="button" onClick={start} className="btn-primary w-full">
            Start setup
          </button>
        )}

        {starting && (
          <div className="text-left">
            <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-ink-800">
              <div
                className="h-full rounded-full bg-signal transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between font-mono text-xs text-muted">
              <span>{modelProgress?.text ?? 'Preparing…'}</span>
              <span>{pct}%</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md border border-red-800/40 bg-red-950/30 px-3 py-2">
            <p className="text-xs text-red-300">
              {error}{' '}
              <button type="button" onClick={start} className="underline">
                Try again
              </button>
            </p>
            <p className="mt-1 text-xs text-muted">{SUPPORT_BLURB}</p>
          </div>
        )}
      </div>
    </div>
  );
}
