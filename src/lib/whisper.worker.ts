/// <reference lib="webworker" />
import { pipeline } from '@huggingface/transformers';
import { getErrorMessage } from './errors';
import { WHISPER_MODEL_ID } from './whisperModel';

// Whisper's own quantized (int8/uint8) encoder weights use a ConvInteger op
// that onnxruntime-web's WASM backend can't execute ("Could not find an
// implementation for ConvInteger"), confirmed by hitting that exact error
// live. fp16 avoids the integer-quantization path entirely and still
// roughly halves the fp32 download (~146MB total vs ~290MB).
const DTYPE = 'fp16';

// `pipeline(...)`'s inferred return type is a deeply nested union TS can't
// represent reasonably (same TS2590 issue as embeddings.worker.ts / lite.worker.ts).
interface Transcriber {
  (audio: Float32Array): Promise<{ text: string }>;
}

type ProgressEvent =
  | { status: 'initiate' | 'download'; file: string }
  | { status: 'progress'; file: string; loaded: number; total: number }
  | { status: 'done'; file: string }
  | { status: 'ready' };

let pipelinePromise: Promise<Transcriber> | null = null;

// Same reasoning as lite.worker.ts: Transformers.js reports progress per
// file, not as one unified number, so this sums loaded/total bytes across
// every file in flight for an honest overall percentage.
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
  return { progress, text: 'Downloading the voice model…' };
}

function getTranscriber(onProgress: (p: { progress: number; text: string }) => void): Promise<Transcriber> {
  if (!pipelinePromise) {
    pipelinePromise = pipeline('automatic-speech-recognition', WHISPER_MODEL_ID, {
      dtype: DTYPE,
      device: 'wasm',
      progress_callback: (event: ProgressEvent) => {
        if (event.status === 'progress' && event.file) {
          fileTotals.set(event.file, event.total);
          fileLoaded.set(event.file, event.loaded);
          onProgress(aggregateProgress());
        } else if (event.status === 'done' && event.file) {
          fileLoaded.set(event.file, fileTotals.get(event.file) ?? fileLoaded.get(event.file) ?? 0);
          onProgress(aggregateProgress());
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any) as unknown as Promise<Transcriber>;
  }
  return pipelinePromise;
}

export type WhisperRequest =
  | { type: 'load' }
  | { type: 'transcribe'; id: string; audio: Float32Array };

export type WhisperResponse =
  | { type: 'progress'; progress: number; text: string }
  | { type: 'ready' }
  | { type: 'load-error'; message: string }
  | { type: 'result'; id: string; text: string }
  | { type: 'error'; id: string; message: string };

function post(msg: WhisperResponse) {
  (self as unknown as Worker).postMessage(msg);
}

self.onmessage = async (event: MessageEvent<WhisperRequest>) => {
  const data = event.data;

  if (data.type === 'load') {
    try {
      await getTranscriber((p) => post({ type: 'progress', ...p }));
      post({ type: 'ready' });
    } catch (err) {
      post({ type: 'load-error', message: getErrorMessage(err, 'Could not load the voice model.') });
    }
    return;
  }

  if (data.type === 'transcribe') {
    const { id, audio } = data;
    try {
      const transcriber = await getTranscriber((p) => post({ type: 'progress', ...p }));
      const output = await transcriber(audio);
      post({ type: 'result', id, text: output.text });
    } catch (err) {
      post({ type: 'error', id, message: getErrorMessage(err, 'Transcription failed.') });
    }
  }
};
