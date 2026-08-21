// Split out on purpose, same reasoning as liteModel.ts: whisper.ts (used by
// the composer, part of the always-loaded chat UI) must never import a
// value from whisper.worker.ts directly, since that file pulls in
// @huggingface/transformers. A normal (non-worker-constructor) import edge
// into a worker's module bundles that worker's whole dependency graph into
// the importer's chunk instead of keeping it split out.
export const WHISPER_MODEL_ID = 'onnx-community/whisper-base';
