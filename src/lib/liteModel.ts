// Split out of lite.worker.ts / liteLlm.ts on purpose: liteLlm.ts (imported
// by useAppStore.ts, always loaded) needs this id, but must never import
// anything from lite.worker.ts directly, since that file pulls in
// @huggingface/transformers. A normal (non-worker-constructor) import edge
// into a worker's module bundles that worker's whole dependency graph into
// the importer's chunk instead of keeping it split out, which previously
// added several MB of ONNX runtime code to every user's main bundle even on
// the fast WebGPU path that never touches lite mode.
export const LITE_MODEL_ID = 'HuggingFaceTB/SmolLM2-360M-Instruct';
