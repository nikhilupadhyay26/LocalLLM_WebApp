import { useAppStore } from '@/store/useAppStore';
import { LITE_MODEL_LABEL, LITE_MODEL_SIZE } from '@/lib/liteLlm';

/**
 * Shown once, before onboarding starts, only when isLowMemoryDevice() flags
 * the device as low-memory (see webgpu.ts). Not about download size, the
 * default model is small either way now, it's that a low-memory device
 * often also has a weak or shared-memory GPU, which makes WebGPU less
 * reliable there (see the device-loss handling in useAppStore.ts). Lite
 * mode sidesteps that entirely by never touching the GPU at all.
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
          PouchLM's full experience uses your device's GPU (via WebGPU) to run the AI model. Lower-memory
          devices often have a weaker or shared-memory graphics processor, which can make that less reliable.
        </p>
        <p className="mt-3 text-sm text-secondary">
          We'd recommend the {LITE_MODEL_LABEL} instead: a similarly small {LITE_MODEL_SIZE} download that runs
          entirely on your device's CPU, no GPU needed at all. The tradeoff is real, replies are slower, but
          it's far less likely to run into trouble on a device like this.
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
