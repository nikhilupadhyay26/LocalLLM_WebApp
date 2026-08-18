/// <reference lib="webworker" />
import { pipeline, TextStreamer } from '@huggingface/transformers';
import { getErrorMessage } from './errors';
import { LITE_MODEL_ID } from './liteModel';

// `pipeline(...)`'s inferred return type is a deeply nested union TS can't
// represent reasonably (same TS2590 issue as embeddings.worker.ts), so
// narrow it to the bits actually used here.
interface ChatPipeline {
  (
    messages: { role: string; content: string }[],
    opts: { max_new_tokens: number; streamer?: unknown },
  ): Promise<unknown>;
  tokenizer: unknown;
  model: { config: { max_position_embeddings?: number } };
}

type ProgressEvent =
  | { status: 'initiate' | 'download'; file: string }
  | { status: 'progress'; file: string; loaded: number; total: number }
  | { status: 'done'; file: string }
  | { status: 'ready' };

let pipelinePromise: Promise<ChatPipeline> | null = null;

// Transformers.js reports progress per file (config.json, tokenizer files,
// the multi-hundred-MB weight file, ...), not as one unified number.
// Summing loaded/total bytes across every file in flight gives an honest
// overall percentage instead of the bar resetting or jumping per file.
const fileTotals = new Map<string, number>();
const fileLoaded = new Map<string, number>();

function aggregateProgress(): { progress: number; text: string } {
  let loaded = 0;
  let total = 0;
  for (const [file, t] of fileTotals) {
    total += t;
    loaded += fileLoaded.get(file) ?? 0;
  }
  const progress = total > 0 ? loaded / total : 0;
  return { progress, text: 'Downloading the lite model…' };
}

function getPipeline(onProgress: (p: { progress: number; text: string }) => void): Promise<ChatPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = pipeline('text-generation', LITE_MODEL_ID, {
      dtype: 'q4',
      device: 'wasm',
      progress_callback: (event: ProgressEvent) => {
        if (event.status === 'progress') {
          fileTotals.set(event.file, event.total);
          fileLoaded.set(event.file, event.loaded);
          onProgress(aggregateProgress());
        } else if (event.status === 'done') {
          fileLoaded.set(event.file, fileTotals.get(event.file) ?? fileLoaded.get(event.file) ?? 0);
          onProgress(aggregateProgress());
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any) as unknown as Promise<ChatPipeline>;
  }
  return pipelinePromise;
}

export interface LiteMessage {
  role: string;
  content: string;
}

export type LiteRequest =
  | { type: 'load' }
  | { type: 'chat'; id: string; messages: LiteMessage[] };

export type LiteResponse =
  | { type: 'progress'; progress: number; text: string }
  | { type: 'ready'; contextWindow: number }
  | { type: 'load-error'; message: string }
  | { type: 'token'; id: string; textSoFar: string }
  | { type: 'done'; id: string; fullText: string }
  | { type: 'error'; id: string; message: string };

function post(msg: LiteResponse) {
  (self as unknown as Worker).postMessage(msg);
}

// Long enough to cover typical replies without letting one runaway
// generation (e.g. the model failing to produce an end-of-turn token) hang
// the worker indefinitely.
const MAX_NEW_TOKENS = 1024;

self.onmessage = async (event: MessageEvent<LiteRequest>) => {
  const data = event.data;

  if (data.type === 'load') {
    try {
      const pipe = await getPipeline((p) => post({ type: 'progress', ...p }));
      post({ type: 'ready', contextWindow: pipe.model.config.max_position_embeddings ?? 2048 });
    } catch (err) {
      post({ type: 'load-error', message: getErrorMessage(err, 'Could not load the lite model.') });
    }
    return;
  }

  if (data.type === 'chat') {
    const { id, messages } = data;
    try {
      const pipe = await getPipeline((p) => post({ type: 'progress', ...p }));
      let full = '';
      const streamer = new TextStreamer(pipe.tokenizer as never, {
        skip_prompt: true,
        callback_function: (text: string) => {
          full += text;
          post({ type: 'token', id, textSoFar: full });
        },
      });
      await pipe(messages, { max_new_tokens: MAX_NEW_TOKENS, streamer });
      post({ type: 'done', id, fullText: full });
    } catch (err) {
      post({ type: 'error', id, message: getErrorMessage(err, 'Generation failed.') });
    }
  }
};
