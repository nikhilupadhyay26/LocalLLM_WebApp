import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { buildSupportMailto, SUPPORT_EMAIL } from '@/lib/support';
import { isIOS } from '@/lib/webgpu';

const AUTO_RETRY_INTERVAL_MS = 8000;
const AUTO_RETRY_MAX_ATTEMPTS = 8; // ~1 minute of hands-free retrying before giving up

export default function UnsupportedBrowser() {
  const webgpuStatus = useAppStore((s) => s.webgpuStatus);
  const webgpuFailureKind = useAppStore((s) => s.webgpuFailureKind);
  const webgpuFailureReason = useAppStore((s) => s.webgpuFailureReason);
  const checkWebGpuSupport = useAppStore((s) => s.checkWebGpuSupport);
  const acceptLiteMode = useAppStore((s) => s.acceptLiteMode);
  const [retrying, setRetrying] = useState(false);
  const [autoAttempts, setAutoAttempts] = useState(0);
  const autoAttemptsRef = useRef(0);

  // "no-api" means this browser genuinely has no WebGPU: switching browsers
  // is the right advice, and no amount of retrying changes that. Any other
  // failure means the API exists but this specific check failed, most often
  // a GPU process that crashed mid-session (common after a heavy WebGPU
  // workload) and is usually already respawning on its own.
  const wrongBrowser = webgpuFailureKind === 'no-api';
  const recoverable = !wrongBrowser;
  const [onIOS] = useState(isIOS);

  const retry = async () => {
    setRetrying(true);
    await checkWebGpuSupport();
    setRetrying(false);
  };

  // Self-heals in the background so most people never have to notice or do
  // anything: don't ask every user to restart their browser when the app
  // can just quietly keep checking until the GPU process comes back.
  useEffect(() => {
    if (!recoverable || webgpuStatus !== 'unavailable') return;
    const interval = setInterval(() => {
      if (autoAttemptsRef.current >= AUTO_RETRY_MAX_ATTEMPTS) {
        clearInterval(interval);
        return;
      }
      autoAttemptsRef.current += 1;
      setAutoAttempts(autoAttemptsRef.current);
      void checkWebGpuSupport();
    }, AUTO_RETRY_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recoverable, webgpuStatus]);

  const stillAutoRetrying = recoverable && autoAttempts < AUTO_RETRY_MAX_ATTEMPTS;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="card max-w-md p-8">
        <p className="mono-tag mb-3">Browser check</p>
        {wrongBrowser ? (
          <>
            <h1 className="mb-3 text-xl font-medium text-primary">The fast engine isn't available on this device</h1>
            <p className="text-sm text-secondary">
              {onIOS ? (
                <>
                  PouchLM's full-speed AI needs a browser feature Apple only added in{' '}
                  <span className="text-primary">iOS 26</span>. Every browser on iPhone and iPad uses the same
                  underlying engine, so switching apps won't help, updating your iOS version will.
                </>
              ) : (
                <>
                  It needs a browser feature (WebGPU) this browser doesn't have. The latest{' '}
                  <span className="text-primary">Chrome</span> or <span className="text-primary">Edge</span> on
                  desktop supports it.
                </>
              )}
            </p>
            <p className="mt-3 text-sm text-secondary">
              In the meantime, PouchLM can run a smaller model directly on this device instead, no GPU needed.
              It's a real tradeoff: a less capable model and noticeably slower replies, still entirely on-device.
            </p>
            <button type="button" onClick={acceptLiteMode} className="btn-primary mt-4 w-full">
              Continue in Lite mode
            </button>
          </>
        ) : (
          <>
            <h1 className="mb-3 text-xl font-medium text-primary">Reconnecting to your GPU</h1>
            <p className="text-sm text-secondary">
              {stillAutoRetrying
                ? "This usually resolves on its own within a few seconds, so PouchLM is retrying automatically. No need to do anything."
                : "This is taking longer than usual. Restarting your browser (not just this tab) generally fixes it."}
            </p>
          </>
        )}

        {!wrongBrowser && (
          <button type="button" onClick={() => void retry()} disabled={retrying} className="btn-secondary mt-4">
            {retrying ? 'Checking…' : 'Try again now'}
          </button>
        )}

        {stillAutoRetrying && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" aria-hidden="true" />
            Checking automatically every few seconds…
          </p>
        )}

        {!wrongBrowser && !stillAutoRetrying && (
          <button type="button" onClick={acceptLiteMode} className="mt-3 text-xs text-secondary underline">
            Continue in Lite mode instead
          </button>
        )}

        {webgpuFailureReason && (
          <p className="mt-3 break-words font-mono text-[11px] text-muted">{webgpuFailureReason}</p>
        )}

        <p className="mt-4 text-xs text-muted">
          Still stuck? Email{' '}
          <a href={buildSupportMailto('PouchLM: WebGPU not detected', webgpuFailureReason ?? undefined)} className="underline">
            {SUPPORT_EMAIL}
          </a>
          . We usually respond within 24 hours.
        </p>
      </div>
    </div>
  );
}
