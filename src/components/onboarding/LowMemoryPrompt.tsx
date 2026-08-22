import { useAppStore } from '@/store/useAppStore';
import { MODEL_SIZE } from '@/lib/llm';
import { LITE_MODEL_LABEL, LITE_MODEL_SIZE } from '@/lib/liteLlm';

/**
 * Shown once, before onboarding starts, only when isLowMemoryDevice() flags
 * the device as low-memory (see webgpu.ts). WebGPU itself may work fine
 * here, this isn't about capability, it's about the ~1GB download and the
 * memory it takes to run being a real risk (slow, or a killed browser tab)
 * on a device this constrained, so the choice is offered upfront rather
 * than after someone hits trouble mid-download.
 */
export default function LowMemoryPrompt() {
  const acceptLiteMode = useAppStore((s) => s.acceptLiteMode);
  const dismissLowMemoryPrompt = useAppStore((s) => s.dismissLowMemoryPrompt);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="card max-w-md p-8">
        <p className="mono-tag mb-3">Device check</p>
        <h1 className="mb-3 text-xl font-medium text-primary">This looks like a lower-memory device</h1>
        <p className="text-sm text-secondary">
          PouchLM's full model is a {MODEL_SIZE} download and uses a fair amount of memory to run. On a device
          like this, that can be slow to download, or risk running out of memory partway through.
        </p>
        <p className="mt-3 text-sm text-secondary">
          We'd recommend the {LITE_MODEL_LABEL} instead: a much smaller {LITE_MODEL_SIZE} download that's
          lighter to run. The tradeoff is real, replies are slower since it runs on your CPU instead of a GPU,
          but it's far less likely to run into trouble on a device like this.
        </p>
        <button type="button" onClick={acceptLiteMode} className="btn-primary mt-4 w-full">
          Use Lite mode (recommended)
        </button>
        <button type="button" onClick={dismissLowMemoryPrompt} className="mt-3 text-xs text-secondary underline">
          Continue with the full experience anyway
        </button>
      </div>
    </div>
  );
}
