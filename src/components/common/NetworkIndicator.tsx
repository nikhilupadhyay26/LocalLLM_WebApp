import { useEffect, useState } from 'react';
import { subscribeNetworkLog, type NetworkLogEntry } from '@/lib/networkMonitor';

const PURPOSE_LABEL: Record<NetworkLogEntry['purpose'], string> = {
  'model-asset': 'AI model download',
  other: 'request',
};

/**
 * The signature trust element from PRD Section 13: a small, always-accurate,
 * live counter of real network requests, not a copy claim. During model
 * download this legitimately shows a growing count (asset fetches); once
 * the model is cached, it sits at whatever count it reached and never
 * climbs again during chat, because none of that touches the network.
 */
export default function NetworkIndicator() {
  const [log, setLog] = useState<NetworkLogEntry[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeNetworkLog(setLog), []);

  const dataRequests = log.filter((e) => e.purpose === 'other');
  const isClean = dataRequests.length === 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900 px-3 py-1.5 text-xs font-mono
          text-secondary hover:border-ink-500"
        aria-expanded={open}
        aria-label="Network activity"
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${isClean ? 'bg-signal' : 'bg-amber-400'} ${
            isClean ? '' : 'animate-pulse-slow'
          }`}
          aria-hidden="true"
        />
        {dataRequests.length} data request{dataRequests.length === 1 ? '' : 's'} this session
      </button>

      {open && (
        <div
          className="card absolute right-0 top-full z-20 mt-2 w-80 p-4 text-sm shadow-xl"
          role="dialog"
          aria-label="Network request log"
        >
          <p className="mono-tag mb-2">Live request log</p>
          <p className="mb-3 text-secondary">
            This is every network request LocalDesk has made this session. Document content and chat never appear
            here. Those never leave your device.
          </p>
          {log.length === 0 ? (
            <p className="text-muted">No requests yet.</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto font-mono text-xs text-secondary">
              {log.slice(-20).map((entry, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>{PURPOSE_LABEL[entry.purpose]}</span>
                  <span className="text-muted">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
