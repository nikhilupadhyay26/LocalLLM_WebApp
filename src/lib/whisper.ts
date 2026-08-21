import type { ModelLoadProgress } from '@/types';
// Type-only: never import a value from whisper.worker.ts here (see whisperModel.ts).
import type { WhisperRequest, WhisperResponse } from './whisper.worker';
import { WHISPER_MODEL_ID } from './whisperModel';

export { WHISPER_MODEL_ID };
export const WHISPER_MODEL_LABEL = 'Voice input model';
export const WHISPER_MODEL_SIZE = '~150MB';

let worker: Worker | null = null;
let ready = false;
let loadingPromise: Promise<void> | null = null;

const pending = new Map<string, { resolve: (text: string) => void; reject: (e: Error) => void }>();

function failAllPending(message: string) {
  for (const entry of pending.values()) entry.reject(new Error(message));
  pending.clear();
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' });
    // Same recovery pattern as embeddings.ts / liteLlm.ts: if the worker
    // crashes outright, nothing waiting would otherwise ever hear back.
    worker.onerror = () => {
      failAllPending('The voice input worker crashed. Try again.');
      ready = false;
      loadingPromise = null;
      worker = null;
    };
  }
  return worker;
}

export function isWhisperModelReady(): boolean {
  return ready;
}

export function loadWhisperModel(onProgress: (p: ModelLoadProgress) => void): Promise<void> {
  if (ready) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  const w = getWorker();
  loadingPromise = new Promise<void>((resolve, reject) => {
    w.onmessage = (event: MessageEvent<WhisperResponse>) => {
      const msg = event.data;
      if (msg.type === 'progress') {
        onProgress({ progress: msg.progress, text: msg.text });
      } else if (msg.type === 'ready') {
        ready = true;
        wireDispatch(w);
        resolve();
      } else if (msg.type === 'load-error') {
        loadingPromise = null;
        reject(new Error(msg.message));
      }
    };
    const req: WhisperRequest = { type: 'load' };
    w.postMessage(req);
  });
  return loadingPromise;
}

// Switches the worker's onmessage handler from the one-time load flow above
// to the steady-state per-request dispatch used once the model is ready.
function wireDispatch(w: Worker) {
  w.onmessage = (event: MessageEvent<WhisperResponse>) => {
    const msg = event.data;
    if (msg.type === 'progress' || msg.type === 'ready' || msg.type === 'load-error') return;
    const entry = pending.get(msg.id);
    if (!entry) return;
    pending.delete(msg.id);
    if (msg.type === 'result') entry.resolve(msg.text);
    else entry.reject(new Error(msg.message));
  };
}

/** `audio` must be mono, 16kHz Float32 samples (see useVoiceInput.ts). Transfers the buffer, so don't reuse it after calling this. */
export function transcribeAudioChunk(audio: Float32Array): Promise<string> {
  if (!ready) return Promise.reject(new Error('Voice model is not loaded yet.'));
  const w = getWorker();
  const id = crypto.randomUUID();
  return new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    const req: WhisperRequest = { type: 'transcribe', id, audio };
    w.postMessage(req, [audio.buffer]);
  });
}
