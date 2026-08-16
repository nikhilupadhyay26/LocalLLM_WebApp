/// <reference lib="webworker" />
import { pipeline } from '@huggingface/transformers';

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

// `pipeline(...)`'s inferred return type is a deeply nested union that TS
// can't represent reasonably (TS2590), so narrow it to the bits we use.
type Extractor = (texts: string[], opts: { pooling: string; normalize: boolean }) => Promise<{ tolist: () => number[][] }>;

let extractorPromise: Promise<Extractor> | null = null;

function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    // fp32 is Transformers.js's default if unspecified; q8 cuts the weights
    // to a quarter of the memory bandwidth with negligible quality loss for
    // a sentence-embedding model this small.
    extractorPromise = pipeline('feature-extraction', MODEL_ID, { dtype: 'q8' }) as unknown as Promise<Extractor>;
  }
  return extractorPromise;
}

export type EmbedRequest = { type: 'embed'; id: string; texts: string[] };
export type EmbedResponse =
  | { type: 'result'; id: string; embeddings: number[][] }
  | { type: 'progress'; id: string; completed: number; total: number }
  | { type: 'error'; id: string; message: string };

// A single extractor(texts, ...) call over thousands of chunks (a large PDF
// easily produces this many) builds one giant batch tensor and can exhaust
// the WASM runtime's memory, aborting with a raw (non-Error) throw rather
// than failing gracefully. Batching keeps peak memory bounded regardless of
// document size, and doubles as natural progress-reporting granularity.
const BATCH_SIZE = 32;

self.onmessage = async (event: MessageEvent<EmbedRequest>) => {
  const { type, id, texts } = event.data;
  if (type !== 'embed') return;

  try {
    const extractor = await getExtractor();
    const embeddings: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const output = await extractor(batch, { pooling: 'mean', normalize: true });
      embeddings.push(...(output.tolist() as number[][]));
      const progress: EmbedResponse = { type: 'progress', id, completed: embeddings.length, total: texts.length };
      (self as unknown as Worker).postMessage(progress);
    }
    const response: EmbedResponse = { type: 'result', id, embeddings };
    (self as unknown as Worker).postMessage(response);
  } catch (err) {
    const response: EmbedResponse = {
      type: 'error',
      id,
      message: err instanceof Error ? err.message : 'Embedding failed',
    };
    (self as unknown as Worker).postMessage(response);
  }
};
