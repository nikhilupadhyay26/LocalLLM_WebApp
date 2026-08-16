import { CreateWebWorkerMLCEngine, prebuiltAppConfig, type InitProgressReport, type MLCEngineInterface } from '@mlc-ai/web-llm';
import type { ModelLoadProgress } from '@/types';

// Launch ships with one model: small enough to load quickly and run
// comfortably on modest hardware. More tiers can come back later without
// touching anything downstream of this file.
export const MODEL_ID = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
export const MODEL_LABEL = 'AI model';
export const MODEL_SIZE = '~1GB';

// WebLLM's prebuilt model list often caps context_window_size well below
// what the underlying model natively supports (browser memory/KV-cache
// constraints). Read the real, currently-active number from WebLLM's own
// shipped config for this exact model id, never hardcode an assumed limit:
// if the library's prebuilt list changes, this adapts automatically.
const FALLBACK_CONTEXT_WINDOW = 4096;

export function getContextWindowSize(): number {
  const record = prebuiltAppConfig.model_list.find((m) => m.model_id === MODEL_ID);
  return record?.overrides?.context_window_size ?? FALLBACK_CONTEXT_WINDOW;
}

let engine: MLCEngineInterface | null = null;
let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./llm.worker.ts', import.meta.url), { type: 'module' });
  }
  return worker;
}

export async function loadModel(onProgress: (p: ModelLoadProgress) => void): Promise<MLCEngineInterface> {
  if (engine) return engine;

  engine = await CreateWebWorkerMLCEngine(getWorker(), MODEL_ID, {
    initProgressCallback: (report: InitProgressReport) => {
      onProgress({ progress: report.progress, text: report.text, timeElapsedSeconds: report.timeElapsed });
    },
  });
  return engine;
}

export function getLoadedEngine(): MLCEngineInterface | null {
  return engine;
}

export function hasLoadedEngine(): boolean {
  return engine !== null;
}

// WebLLM's own reload() docs note the engine can throw when the GPU device
// is lost (commonly after heavy use, e.g. a background GPU-process crash)
// and recommend simply reloading. Recognizing that pattern lets chat
// recover on its own instead of leaving the user stuck on a dead engine
// with only a generic failure message.
function looksLikeDeviceLoss(err: unknown): boolean {
  const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return /device|adapter|webgpu|gpu process|lost connection|context.*(lost|destroyed)/.test(message);
}

/** Drops the current engine and reloads it fresh. Weights are cache-backed, so this is quick, not a full re-download. Returns false if there's nothing to recover from. */
async function recoverEngine(): Promise<boolean> {
  engine = null;
  try {
    await loadModel(() => {});
    return true;
  } catch {
    return false;
  }
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatStreamHandlers {
  onToken: (fullTextSoFar: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

export async function streamChatCompletion(
  messages: LlmMessage[],
  handlers: ChatStreamHandlers,
  alreadyRetried = false,
): Promise<void> {
  if (!engine) {
    handlers.onError(new Error('Model is not loaded yet.'));
    return;
  }

  let full = '';
  try {
    const stream = await engine.chat.completions.create({
      messages,
      stream: true,
      temperature: 0.3,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (delta) {
        full += delta;
        handlers.onToken(full);
      }
    }
    handlers.onDone(full);
  } catch (err) {
    // Only safe to retry if nothing has streamed to the UI yet; a mid-stream
    // failure should surface as-is rather than silently restart the reply.
    if (full === '' && !alreadyRetried && looksLikeDeviceLoss(err) && (await recoverEngine())) {
      return streamChatCompletion(messages, handlers, true);
    }
    if (looksLikeDeviceLoss(err)) {
      handlers.onError(new Error('Lost connection to your GPU and could not reconnect automatically. Try again, or reload the page.'));
      return;
    }
    handlers.onError(err instanceof Error ? err : new Error('Generation failed'));
  }
}

/** Non-streaming completion. Used for summarizing older conversation turns. */
export async function completeMessages(messages: LlmMessage[], alreadyRetried = false): Promise<string> {
  if (!engine) throw new Error('Model is not loaded yet.');
  try {
    const result = await engine.chat.completions.create({
      messages,
      stream: false,
      temperature: 0.1,
    });
    return result.choices[0]?.message?.content ?? '';
  } catch (err) {
    if (!alreadyRetried && looksLikeDeviceLoss(err) && (await recoverEngine())) {
      return completeMessages(messages, true);
    }
    if (looksLikeDeviceLoss(err)) {
      throw new Error('Lost connection to your GPU and could not reconnect automatically. Try again, or reload the page.');
    }
    throw err instanceof Error ? err : new Error('Generation failed.');
  }
}
