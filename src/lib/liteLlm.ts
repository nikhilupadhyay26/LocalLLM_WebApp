import type { ModelLoadProgress } from '@/types';
// Type-only: never import a value from lite.worker.ts here, that would pull
// its whole @huggingface/transformers dependency graph into this file's
// chunk (see liteModel.ts for the full explanation).
import type { LiteRequest, LiteResponse } from './lite.worker';
import { LITE_MODEL_ID } from './liteModel';
import type { LlmMessage } from './llm';

// Used only when checkWebGPU() finds no WebGPU API at all (see webgpu.ts):
// a real, on-device fallback for browsers that will never get the fast
// path, at the cost of a smaller model and CPU-bound WASM generation
// instead of a GPU.
export { LITE_MODEL_ID };
export const LITE_MODEL_LABEL = 'Lite AI model';
export const LITE_MODEL_SIZE = '~400MB';

let worker: Worker | null = null;
let ready = false;
let contextWindow = 2048;
let loadingPromise: Promise<void> | null = null;

const pending = new Map<
  string,
  { onToken: (fullTextSoFar: string) => void; resolve: (fullText: string) => void; reject: (e: Error) => void }
>();

function failAllPending(message: string) {
  for (const entry of pending.values()) entry.reject(new Error(message));
  pending.clear();
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./lite.worker.ts', import.meta.url), { type: 'module' });
    // If the worker crashes outright (not just a normal 'error' response for
    // one request), nothing waiting would otherwise ever hear back. Fail
    // loudly and let the next call spin up a fresh worker, same recovery
    // pattern as embeddings.ts.
    worker.onerror = () => {
      failAllPending('The lite model worker crashed. Try again.');
      ready = false;
      loadingPromise = null;
      worker = null;
    };
  }
  return worker;
}

export function isLiteModelReady(): boolean {
  return ready;
}

export function getLiteContextWindowSize(): number {
  return contextWindow;
}

export function loadLiteModel(onProgress: (p: ModelLoadProgress) => void): Promise<void> {
  if (ready) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  const w = getWorker();
  loadingPromise = new Promise<void>((resolve, reject) => {
    w.onmessage = (event: MessageEvent<LiteResponse>) => {
      const msg = event.data;
      if (msg.type === 'progress') {
        onProgress({ progress: msg.progress, text: msg.text });
      } else if (msg.type === 'ready') {
        ready = true;
        contextWindow = msg.contextWindow;
        wireDispatch(w);
        resolve();
      } else if (msg.type === 'load-error') {
        loadingPromise = null;
        reject(new Error(msg.message));
      }
    };
    const req: LiteRequest = { type: 'load' };
    w.postMessage(req);
  });
  return loadingPromise;
}

// Switches the worker's onmessage handler from the one-time load flow above
// to the steady-state per-request dispatch used once the model is ready.
function wireDispatch(w: Worker) {
  w.onmessage = (event: MessageEvent<LiteResponse>) => {
    const msg = event.data;
    if (msg.type === 'progress' || msg.type === 'ready' || msg.type === 'load-error') return;
    const entry = pending.get(msg.id);
    if (!entry) return;
    if (msg.type === 'token') {
      entry.onToken(msg.textSoFar);
      return;
    }
    pending.delete(msg.id);
    if (msg.type === 'done') entry.resolve(msg.fullText);
    else entry.reject(new Error(msg.message));
  };
}

export interface LiteChatHandlers {
  onToken: (fullTextSoFar: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

export async function streamLiteChatCompletion(messages: LlmMessage[], handlers: LiteChatHandlers): Promise<void> {
  if (!ready) {
    handlers.onError(new Error('Lite model is not loaded yet.'));
    return;
  }
  const w = getWorker();
  const id = crypto.randomUUID();
  try {
    const fullText = await new Promise<string>((resolve, reject) => {
      pending.set(id, { onToken: handlers.onToken, resolve, reject });
      const req: LiteRequest = { type: 'chat', id, messages };
      w.postMessage(req);
    });
    handlers.onDone(fullText);
  } catch (err) {
    handlers.onError(err instanceof Error ? err : new Error('Generation failed'));
  }
}

/** Non-streaming completion, used for summarizing older conversation turns (mirrors llm.ts's completeMessages). */
export async function completeLiteMessages(messages: LlmMessage[]): Promise<string> {
  if (!ready) throw new Error('Lite model is not loaded yet.');
  const w = getWorker();
  const id = crypto.randomUUID();
  return new Promise<string>((resolve, reject) => {
    pending.set(id, { onToken: () => {}, resolve, reject });
    const req: LiteRequest = { type: 'chat', id, messages };
    w.postMessage(req);
  });
}
