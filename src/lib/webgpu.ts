interface NavigatorWithGPU extends Navigator {
  gpu: {
    requestAdapter: () => Promise<unknown>;
  };
}

export interface WebGPUCheckResult {
  available: boolean;
  /** The actual reason detection failed, never swallowed, so a "should work" report is diagnosable. */
  reason: string | null;
  /**
   * 'no-api': the browser itself has no WebGPU support at all (wrong browser).
   * 'no-adapter' / 'error': the API exists but this specific request failed
   * (blocklisted GPU, or more often a transient GPU-process crash), which is
   * usually fixed by restarting the browser rather than switching browsers.
   */
  kind: 'ok' | 'no-api' | 'no-adapter' | 'error';
}

export async function checkWebGPU(): Promise<WebGPUCheckResult> {
  if (!('gpu' in navigator)) {
    return { available: false, kind: 'no-api', reason: 'navigator.gpu is not present in this browser.' };
  }
  try {
    const gpu = (navigator as NavigatorWithGPU).gpu;
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      return {
        available: false,
        kind: 'no-adapter',
        reason: 'requestAdapter() returned null (no compatible GPU adapter).',
      };
    }
    return { available: true, kind: 'ok', reason: null };
  } catch (err) {
    const reason = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return { available: false, kind: 'error', reason };
  }
}

// A "no adapter"/"error" result is very often a GPU process that crashed
// under load and is already respawning in the background (Chrome does this
// automatically, usually within a second or two), not a real unsupported
// browser. Retrying a few times before giving up means most people never
// see an error at all. 'no-api' never gets better on retry, so don't waste
// time on it.
const RETRY_DELAYS_MS = [500, 1500, 3000];

export async function checkWebGPUWithRetries(): Promise<WebGPUCheckResult> {
  let result = await checkWebGPU();
  if (result.available || result.kind === 'no-api') return result;

  for (const delay of RETRY_DELAYS_MS) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    result = await checkWebGPU();
    if (result.available) return result;
  }
  return result;
}

// Every iOS browser (Chrome, Edge, Firefox included) runs on Apple's WebKit
// engine, not its own, so "switch browsers" is never the fix for a WebGPU
// gap on this platform, only an iOS update is. iPadOS 13+ reports as a Mac
// in the user agent, so it's told apart from a real Mac by its touch support.
export function isIOS(): boolean {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

export function isMeteredConnection(): boolean {
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; type?: string; effectiveType?: string };
  };
  const connection = nav.connection;
  if (!connection) return false;
  if (connection.saveData) return true;
  if (connection.type === 'cellular') return true;
  return false;
}
