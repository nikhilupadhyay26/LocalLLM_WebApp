// Wraps window.fetch once, at app boot, to maintain a live, literal count of
// every network request LocalDesk makes: model asset downloads, anything
// else. This is what powers the network indicator badge in the app chrome
// (PRD Section 13): not a marketing claim, an actual live counter reading
// real fetch calls.

export interface NetworkLogEntry {
  url: string;
  purpose: 'model-asset' | 'other';
  timestamp: number;
}

type Listener = (log: NetworkLogEntry[]) => void;

const log: NetworkLogEntry[] = [];
const listeners = new Set<Listener>();
let installed = false;

function classify(url: string): NetworkLogEntry['purpose'] {
  if (
    url.includes('huggingface.co') ||
    url.includes('hf.co') ||
    url.includes('jsdelivr.net') ||
    url.includes('mlc.ai') ||
    url.includes('.wasm') ||
    url.includes('/resolve/')
  ) {
    return 'model-asset';
  }
  return 'other';
}

function notify() {
  listeners.forEach((l) => l([...log]));
}

export function installNetworkMonitor() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].href : args[0].url;
    log.push({ url, purpose: classify(url), timestamp: Date.now() });
    notify();
    return originalFetch(...args);
  };
}

export function subscribeNetworkLog(listener: Listener): () => void {
  listeners.add(listener);
  listener([...log]);
  return () => listeners.delete(listener);
}

export function getNetworkLog(): NetworkLogEntry[] {
  return [...log];
}
