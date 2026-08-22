import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clearAllLocalData, estimateStorageUsage } from '@/lib/db';
import { useAppStore } from '@/store/useAppStore';
import { getModelDisplayName } from '@/lib/llm';
import { LITE_MODEL_LABEL, LITE_MODEL_SIZE } from '@/lib/liteLlm';
import Modal from '@/components/common/Modal';
import ModelDownloadReassurances from '@/components/common/ModelDownloadReassurances';
import ModelDownloadProgressBar from '@/components/common/ModelDownloadProgressBar';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function SettingsPage() {
  const modelId = useAppStore((s) => s.modelId);
  const webgpuStatus = useAppStore((s) => s.webgpuStatus);
  const liteModeAccepted = useAppStore((s) => s.liteModeAccepted);
  const acceptLiteMode = useAppStore((s) => s.acceptLiteMode);
  const ensureModelLoaded = useAppStore((s) => s.ensureModelLoaded);
  const modelProgress = useAppStore((s) => s.modelProgress);
  const lite = webgpuStatus !== 'available' || liteModeAccepted;
  // Only worth offering when WebGPU claims to be available but the user
  // hasn't already switched: this is the escape hatch for a GPU that
  // "supports" WebGPU on paper but keeps failing to actually create a
  // working device (a real failure mode, not just a hypothetical).
  const canSwitchToLite = webgpuStatus === 'available' && !liteModeAccepted;
  const [usage, setUsage] = useState<{ usageBytes: number; quotaBytes: number } | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [switchingToLite, setSwitchingToLite] = useState(false);

  useEffect(() => {
    void estimateStorageUsage().then(setUsage);
  }, []);

  const doClear = async () => {
    await clearAllLocalData();
    setCleared(true);
    setConfirmingClear(false);
  };

  const switchToLite = async () => {
    acceptLiteMode();
    // Downloads (or loads from cache) the lite model right here, with
    // visible progress, instead of leaving it to happen silently behind a
    // bare "thinking…" indicator the next time a message is sent.
    setSwitchingToLite(true);
    try {
      await ensureModelLoaded();
    } catch {
      // Whatever went wrong will still surface the next time a message is
      // sent (ensureModelLoaded's own error path covers that); nothing
      // further to show from here specifically.
    } finally {
      setSwitchingToLite(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <Link to="/app" className="mono-tag mb-6 inline-block">
        ← Back to workspace
      </Link>
      <h1 className="mb-6 text-2xl font-medium text-primary">Settings</h1>

      <section className="card mb-6 p-5">
        <h2 className="mb-2 text-sm font-medium text-primary">Model</h2>
        <p className="text-sm text-secondary">
          {lite ? (
            <>
              PouchLM is running the {LITE_MODEL_LABEL} ({LITE_MODEL_SIZE}) entirely on your device.{' '}
              {webgpuStatus === 'available'
                ? "You've switched to this smaller model that runs on your CPU instead of the faster GPU-based one."
                : "This browser doesn't support the faster GPU-based engine, so PouchLM automatically switched to this smaller model that runs on your CPU instead."}{' '}
              Replies are slower than the full model, but nothing changes about privacy: it still never leaves your
              device.
            </>
          ) : (
            <>
              PouchLM is currently running <span className="text-primary">{getModelDisplayName(modelId)}</span>{' '}
              entirely on your device. You can pick a different model from the menu above the chat box.
            </>
          )}
        </p>
        {canSwitchToLite && (
          <div className="mt-4 border-t border-ink-800 pt-4">
            <p className="mb-2 text-xs text-muted">
              Seeing repeated GPU or generation errors? Switch to the {LITE_MODEL_LABEL} ({LITE_MODEL_SIZE}), a
              smaller model that runs on your CPU instead and doesn't depend on your graphics driver.
            </p>
            <button type="button" onClick={() => void switchToLite()} className="btn-secondary !py-1.5 text-sm">
              Switch to Lite mode
            </button>
          </div>
        )}
      </section>

      <Modal open={switchingToLite} onClose={() => {}} title="Switching to Lite mode" dismissible={false}>
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Downloading the {LITE_MODEL_LABEL} ({LITE_MODEL_SIZE}). This happens once.
          </p>
          <ModelDownloadReassurances />
          <ModelDownloadProgressBar progress={modelProgress} />
        </div>
      </Modal>

      <section className="card mb-6 p-5">
        <h2 className="mb-2 text-sm font-medium text-primary">Local storage</h2>
        <p className="text-sm text-secondary">
          {usage ? (
            <>
              PouchLM is using approximately{' '}
              <span className="text-primary">{formatBytes(usage.usageBytes)}</span> of your browser's storage
              (includes the cached AI model).
            </>
          ) : (
            "Your browser doesn't report storage usage, but everything you upload stays in this browser's local database."
          )}
        </p>
      </section>

      <section className="card border-red-900/40 p-5">
        <h2 className="mb-2 text-sm font-medium text-primary">Clear all local data</h2>
        <p className="mb-3 text-sm text-secondary">
          Deletes every document and chat stored in this browser. This can't be undone.
        </p>
        {cleared ? (
          <p className="text-sm text-signal">All local data has been cleared.</p>
        ) : confirmingClear ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => void doClear()} className="btn bg-red-700 text-white hover:bg-red-600">
              Yes, delete everything
            </button>
            <button type="button" onClick={() => setConfirmingClear(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmingClear(true)} className="btn bg-red-950 text-red-300 hover:bg-red-900">
            Clear all local data
          </button>
        )}
      </section>
    </div>
  );
}
