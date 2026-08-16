import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clearAllLocalData, estimateStorageUsage } from '@/lib/db';
import { MODEL_LABEL, MODEL_SIZE } from '@/lib/llm';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function SettingsPage() {
  const [usage, setUsage] = useState<{ usageBytes: number; quotaBytes: number } | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    void estimateStorageUsage().then(setUsage);
  }, []);

  const doClear = async () => {
    await clearAllLocalData();
    setCleared(true);
    setConfirmingClear(false);
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
          LocalDesk runs the {MODEL_LABEL} ({MODEL_SIZE}) entirely on your device.
        </p>
      </section>

      <section className="card mb-6 p-5">
        <h2 className="mb-2 text-sm font-medium text-primary">Local storage</h2>
        <p className="text-sm text-secondary">
          {usage ? (
            <>
              LocalDesk is using approximately{' '}
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
