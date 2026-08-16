import type { EmbedRequest, EmbedResponse } from './embeddings.worker';

// Generous, but a hard ceiling: a document must never be able to sit on
// "Indexing…" forever with no feedback (see change request: TXT stuck on
// Indexing indefinitely). The embedding model can be slow to warm up on
// first use, so this is minutes, not seconds.
const EMBED_TIMEOUT_MS = 120_000;

let worker: Worker | null = null;
const pending = new Map<string, { resolve: (v: number[][]) => void; reject: (e: Error) => void }>();

function failAllPending(message: string) {
  for (const entry of pending.values()) entry.reject(new Error(message));
  pending.clear();
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./embeddings.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<EmbedResponse>) => {
      const msg = event.data;
      const entry = pending.get(msg.id);
      if (!entry) return;
      pending.delete(msg.id);
      if (msg.type === 'result') entry.resolve(msg.embeddings);
      else entry.reject(new Error(msg.message));
    };
    // If the worker itself crashes (fails to load, throws outside the
    // message handler's try/catch) no 'message' ever arrives, so anything
    // waiting would otherwise hang forever. Fail it loudly instead, and
    // let the next embedTexts() call spin up a fresh worker.
    worker.onerror = () => {
      failAllPending('The embedding worker crashed. Try uploading the file again.');
      worker = null;
    };
  }
  return worker;
}

export function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return Promise.resolve([]);
  const id = crypto.randomUUID();
  const w = getWorker();
  return new Promise<number[][]>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      if (pending.delete(id)) {
        reject(new Error('Embedding this document is taking far longer than expected. Try again.'));
      }
    }, EMBED_TIMEOUT_MS);

    pending.set(id, {
      resolve: (v) => {
        clearTimeout(timeoutId);
        resolve(v);
      },
      reject: (e) => {
        clearTimeout(timeoutId);
        reject(e);
      },
    });
    const req: EmbedRequest = { type: 'embed', id, texts };
    w.postMessage(req);
  });
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
