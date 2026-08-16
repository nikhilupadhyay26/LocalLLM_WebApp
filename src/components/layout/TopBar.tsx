import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';
import NetworkIndicator from '@/components/common/NetworkIndicator';
import { MODEL_LABEL } from '@/lib/llm';

export default function TopBar() {
  const modelReady = useAppStore((s) => s.modelReady);
  const modelProgress = useAppStore((s) => s.modelProgress);
  const setHelpModalOpen = useUiStore((s) => s.setHelpModalOpen);

  const modelStatusText = modelReady
    ? `${MODEL_LABEL} · ready`
    : modelProgress
      ? `Loading ${MODEL_LABEL} · ${Math.round(modelProgress.progress * 100)}%`
      : `${MODEL_LABEL} not loaded yet`;

  return (
    <header className="flex h-14 items-center justify-between border-b border-ink-800 px-4">
      <Link to="/" className="flex items-center gap-2 text-sm font-medium text-primary">
        <span className="h-2 w-2 rounded-full bg-signal" aria-hidden="true" />
        LocalDesk
      </Link>

      <div className="flex items-center gap-3">
        <span className="mono-tag hidden sm:inline">{modelStatusText}</span>

        <NetworkIndicator />

        <button
          type="button"
          onClick={() => setHelpModalOpen(true)}
          className="btn-ghost !px-2 !py-1.5 text-sm"
          aria-label="Help"
        >
          Help
        </button>
        <Link to="/app/settings" className="btn-ghost !px-2 !py-1.5" aria-label="Settings">
          ⚙
        </Link>
      </div>
    </header>
  );
}
