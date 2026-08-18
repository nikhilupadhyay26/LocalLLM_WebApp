import type { ModelLoadProgress } from '@/types';

/** Shared between first-run onboarding and switching to a different model mid-session. */
export default function ModelDownloadProgressBar({ progress }: { progress: ModelLoadProgress | null }) {
  const pct = progress ? Math.round(progress.progress * 100) : 0;
  return (
    <div className="text-left">
      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-ink-800">
        <div className="h-full rounded-full bg-signal transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between font-mono text-xs text-muted">
        <span>{progress ? 'Downloading…' : 'Preparing…'}</span>
        <span>{pct}%</span>
      </div>
    </div>
  );
}
