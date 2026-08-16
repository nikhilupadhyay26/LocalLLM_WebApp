import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { isMeteredConnection } from '@/lib/webgpu';
import { SUPPORT_BLURB } from '@/lib/support';
import { MODEL_SIZE } from '@/lib/llm';

const REASSURANCES = [
  { icon: '🔒', text: 'Stays on your device, nothing you upload is ever sent anywhere.' },
  { icon: '⚡', text: 'One-time only, instant on every visit after this.' },
  { icon: '📶', text: "Best on Wi-Fi, it's a one-time download, worth doing on a strong connection." },
];

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
      <div className="card w-full max-w-xl p-8">
        <p className="mono-tag mb-3">One-time setup</p>
        <h1 className="mb-3 text-xl font-medium text-primary">Setting up your private AI, one-time only</h1>
        <p className="mb-6 text-sm text-secondary">
          We're downloading a compact AI model straight to your browser ({MODEL_SIZE}). This happens once. After
          this, everything runs instantly, even offline.
        </p>

        {/* Stays visible through the whole download, not just before it starts:
            someone watching a multi-minute progress bar needs something to
            read, or an unexplained gigabyte download reads as suspicious. */}
        <div className="mb-6 grid gap-2 sm:grid-cols-3">
          {REASSURANCES.map((item) => (
            <div key={item.text} className="rounded-md border border-ink-700 bg-ink-900 p-3 text-left">
              <span className="mb-1 block text-lg" aria-hidden="true">
                {item.icon}
              </span>
              <p className="text-xs text-secondary">{item.text}</p>
            </div>
          ))}
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

        {starting && (
          <div className="text-left">
            <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-ink-800">
              <div
                className="h-full rounded-full bg-signal transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between font-mono text-xs text-muted">
              <span>{modelProgress ? 'Downloading…' : 'Preparing…'}</span>
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
