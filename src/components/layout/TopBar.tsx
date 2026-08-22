import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';
import NetworkIndicator from '@/components/common/NetworkIndicator';
import { getModelDisplayName } from '@/lib/llm';
import { LITE_MODEL_LABEL } from '@/lib/liteLlm';

interface TopBarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function TopBar({ sidebarOpen, onToggleSidebar }: TopBarProps) {
  const modelReady = useAppStore((s) => s.modelReady);
  const modelProgress = useAppStore((s) => s.modelProgress);
  const modelId = useAppStore((s) => s.modelId);
  const webgpuStatus = useAppStore((s) => s.webgpuStatus);
  const liteModeAccepted = useAppStore((s) => s.liteModeAccepted);
  const setHelpModalOpen = useUiStore((s) => s.setHelpModalOpen);

  const lite = webgpuStatus !== 'available' || liteModeAccepted;
  const modelLabel = lite ? LITE_MODEL_LABEL : getModelDisplayName(modelId);
  const modelStatusText = modelReady
    ? `${modelLabel} · ready`
    : modelProgress
      ? `Loading ${modelLabel} · ${Math.round(modelProgress.progress * 100)}%`
      : `${modelLabel} not loaded yet`;

  return (
    <header className="flex h-14 items-center justify-between gap-2 border-b border-ink-800 px-4">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="btn-ghost shrink-0 !px-2 !py-1.5 text-lg md:hidden"
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2.5 text-base font-semibold text-primary">
          <img src="/icon.png" alt="" className="h-9 w-9 shrink-0 rounded-md" />
          PouchLM
        </Link>
      </div>

      <div className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
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
