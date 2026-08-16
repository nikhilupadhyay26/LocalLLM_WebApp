import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export function useWebGPUCheck() {
  const webgpuStatus = useAppStore((s) => s.webgpuStatus);
  const checkWebGpuSupport = useAppStore((s) => s.checkWebGpuSupport);

  useEffect(() => {
    if (webgpuStatus !== 'checking') return;
    void checkWebGpuSupport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return webgpuStatus;
}
