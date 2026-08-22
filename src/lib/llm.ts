import {
  CreateWebWorkerMLCEngine,
  hasModelInCache,
  prebuiltAppConfig,
  type InitProgressReport,
  type MLCEngineInterface,
} from '@mlc-ai/web-llm';
import type { ModelLoadProgress } from '@/types';

// The model everyone starts on: the smallest in the catalog, so the very
// first download is as fast and low-risk as possible. Anyone can switch to
// a larger, more capable one from the model picker; this is only the
// first-ever default.
export const DEFAULT_MODEL_ID = 'SmolLM2-135M-Instruct-q0f16-MLC';

// WebLLM's full catalog (160+ entries) includes models far too large to run
// reliably on typical hardware. Anything above this VRAM footprint is
// excluded from the picker entirely, never just discouraged.
const VRAM_LIMIT_MB = 4096;

// When a base model ships multiple quantizations, prefer whichever appears
// first here (matches the balance the shipped default already uses), and
// only fall back to a less-preferred one if that base model doesn't offer it.
const QUANT_PREFERENCE = ['q4f16_1', 'q4f32_1', 'q0f16', 'q0f32'];

export interface ModelCatalogEntry {
  id: string;
  displayName: string;
  vramRequiredMB: number;
  sizeLabel: string;
}

function baseNameOf(modelId: string): string {
  const match = modelId.match(/^(.*?)-q\d/);
  return match ? match[1] : modelId;
}

function quantScoreOf(modelId: string): number {
  const idx = QUANT_PREFERENCE.findIndex((q) => modelId.includes(`-${q}`));
  return idx === -1 ? QUANT_PREFERENCE.length : idx;
}

function formatSize(vramMB: number): string {
  return vramMB >= 1024 ? `~${(vramMB / 1024).toFixed(1)}GB` : `~${Math.round(vramMB)}MB`;
}

let cachedCatalog: ModelCatalogEntry[] | null = null;

/**
 * WebLLM's raw model_list is mostly quantization variants of a much smaller
 * set of actual base models (e.g. three separate entries for
 * "Phi-3.5-mini-instruct" alone), so showing it unfiltered reads as "pick a
 * quantization scheme," not "pick a model." Filters by VRAM footprint, then
 * keeps only the single best-quantization, full-context-window variant per
 * base model. Approximate download size is derived from vram_required_MB;
 * WebLLM's config doesn't expose an exact download byte count.
 */
export function getModelCatalog(): ModelCatalogEntry[] {
  if (cachedCatalog) return cachedCatalog;

  const bestPerBase = new Map<string, (typeof prebuiltAppConfig.model_list)[number]>();
  for (const record of prebuiltAppConfig.model_list) {
    const vram = record.vram_required_MB ?? 0;
    if (vram <= 0 || vram > VRAM_LIMIT_MB) continue;
    // Sentence-embedding models (e.g. the snowflake-arctic-embed family)
    // ship in the same catalog but aren't chat models at all; offering them
    // here would let someone pick one and get garbage or an outright
    // failure back from a chat completion call.
    if (/embed/i.test(record.model_id)) continue;

    const base = baseNameOf(record.model_id);
    const existing = bestPerBase.get(base);
    if (!existing) {
      bestPerBase.set(base, record);
      continue;
    }
    // A "-1k"-style suffix means a shortened context window traded for
    // lower memory; prefer the full-context variant when both exist.
    const existingShortened = /-\d+k$/i.test(existing.model_id);
    const candidateShortened = /-\d+k$/i.test(record.model_id);
    if (existingShortened && !candidateShortened) {
      bestPerBase.set(base, record);
    } else if (existingShortened === candidateShortened && quantScoreOf(record.model_id) < quantScoreOf(existing.model_id)) {
      bestPerBase.set(base, record);
    }
  }

  cachedCatalog = Array.from(bestPerBase.values())
    .map((record) => {
      const vramRequiredMB = Math.round(record.vram_required_MB ?? 0);
      return {
        id: record.model_id,
        displayName: baseNameOf(record.model_id).replace(/-/g, ' '),
        vramRequiredMB,
        sizeLabel: formatSize(vramRequiredMB),
      };
    })
    .sort((a, b) => a.vramRequiredMB - b.vramRequiredMB);
  return cachedCatalog;
}

export function getModelDisplayName(modelId: string): string {
  return getModelCatalog().find((m) => m.id === modelId)?.displayName ?? baseNameOf(modelId).replace(/-/g, ' ');
}

export function getModelSizeLabel(modelId: string): string {
  return getModelCatalog().find((m) => m.id === modelId)?.sizeLabel ?? '';
}

export function isModelCached(modelId: string): Promise<boolean> {
  return hasModelInCache(modelId);
}

const FALLBACK_CONTEXT_WINDOW = 4096;

// WebLLM's prebuilt model list often caps context_window_size well below
// what the underlying model natively supports (browser memory/KV-cache
// constraints). Read the real, currently-active number from WebLLM's own
// shipped config for this exact model id, never hardcode an assumed limit:
// if the library's prebuilt list changes, this adapts automatically.
export function getContextWindowSize(modelId: string): number {
  const record = prebuiltAppConfig.model_list.find((m) => m.model_id === modelId);
  return record?.overrides?.context_window_size ?? FALLBACK_CONTEXT_WINDOW;
}

let engine: MLCEngineInterface | null = null;
let loadedModelId: string | null = null;
let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./llm.worker.ts', import.meta.url), { type: 'module' });
  }
  return worker;
}

export async function loadModel(
  modelId: string,
  onProgress: (p: ModelLoadProgress) => void,
): Promise<MLCEngineInterface> {
  if (engine && loadedModelId === modelId) return engine;

  // Switching to a different model: drop the old engine first rather than
  // letting two models' worth of weights sit in memory at once.
  if (engine && loadedModelId !== modelId) {
    await engine.unload();
    engine = null;
    loadedModelId = null;
  }

  engine = await CreateWebWorkerMLCEngine(getWorker(), modelId, {
    initProgressCallback: (report: InitProgressReport) => {
      onProgress({ progress: report.progress, text: report.text, timeElapsedSeconds: report.timeElapsed });
    },
  });
  loadedModelId = modelId;
  return engine;
}

export function getLoadedModelId(): string | null {
  return loadedModelId;
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
export function looksLikeDeviceLoss(err: unknown): boolean {
  const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return /device|adapter|webgpu|gpu process|lost connection|context.*(lost|destroyed)/.test(message);
}

/** Drops the current engine and reloads the same model fresh. Weights are cache-backed, so this is quick, not a full re-download. Returns false if there's nothing to recover from. */
async function recoverEngine(): Promise<boolean> {
  const modelId = loadedModelId;
  if (!modelId) return false;
  engine = null;
  loadedModelId = null;
  try {
    await loadModel(modelId, () => {});
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
