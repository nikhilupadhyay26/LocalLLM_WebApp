import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { isMeteredConnection } from '@/lib/webgpu';
import { SUPPORT_BLURB } from '@/lib/support';
import { MODEL_SIZE } from '@/lib/llm';
import { getErrorMessage } from '@/lib/errors';
import ModelDownloadReassurances from '@/components/common/ModelDownloadReassurances';
import ModelDownloadProgressBar from '@/components/common/ModelDownloadProgressBar';

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
      setError(getErrorMessage(err, 'Could not load the model.'));
      setStarting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="card w-full max-w-xl p-8">
        <p className="mono-tag mb-3">One-time setup</p>
        <h1 className="mb-3 text-xl font-medium text-primary">Setting up your private AI, one-time only</h1>
        <p className="mb-6 text-sm text-secondary">
          We're downloading a compact AI model straight to your browser ({MODEL_SIZE}). This happens once. After
          this, everything runs instantly, even offline.
        </p>

        <div className="mb-6">
          <ModelDownloadReassurances />
        </div>

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

        {starting && <ModelDownloadProgressBar progress={modelProgress} />}

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
