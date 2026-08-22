interface GPUAdapterLike {
  requestDevice: () => Promise<{ destroy: () => void }>;
}

interface NavigatorWithGPU extends Navigator {
  gpu: {
    requestAdapter: () => Promise<GPUAdapterLike | null>;
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
    // An adapter existing isn't enough on its own: actually creating a
    // device is what WebLLM needs to run the model, and that step can fail
    // on its own even with a valid adapter (observed in production as
    // "Failed to execute 'requestDevice' ... DXGI_ERROR_DEVICE_REMOVED", a
    // crashed/reset GPU driver), a failure mode requestAdapter() alone never
    // catches. Immediately destroying the device is fine: this is only a
    // capability probe, WebLLM creates its own device when it actually loads.
    const device = await adapter.requestDevice();
    device.destroy();
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

// A ~1GB download plus what it takes to actually run that model is a real
// risk on a low-memory device: slow at best, a killed browser tab at worst.
// Only Chromium browsers report this at all (Firefox and Safari never
// implemented the Device Memory API); treating "unsupported" as "not low
// memory" is deliberate, since assuming the worst for a browser that simply
// doesn't report anything would wrongly flag every Firefox/Safari visitor.
const LOW_MEMORY_THRESHOLD_GB = 4;

export function isLowMemoryDevice(): boolean {
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (deviceMemory === undefined) return false;
  return deviceMemory <= LOW_MEMORY_THRESHOLD_GB;
}
