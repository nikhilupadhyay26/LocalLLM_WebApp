/**
 * WebLLM and Transformers.js both throw plain strings for several real
 * failure modes (a model missing from the catalog, a cache write failing,
 * an Emscripten/WASM abort), not just `Error` instances. A bare
 * `err instanceof Error` check silently discards the actual reason in
 * those cases and falls back to a generic message, which is exactly the
 * kind of unhelpful, non-actionable error this app is built to avoid.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
}
