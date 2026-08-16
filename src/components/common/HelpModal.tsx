import Modal from './Modal';
import { useUiStore } from '@/store/useUiStore';
import { buildSupportMailto, SUPPORT_EMAIL } from '@/lib/support';

/**
 * A modal rather than a routed page on purpose: closing it naturally
 * reveals whatever screen was underneath (landing, workspace, settings),
 * with no "where does back go" logic to get wrong.
 */
export default function HelpModal() {
  const open = useUiStore((s) => s.helpModalOpen);
  const setOpen = useUiStore((s) => s.setHelpModalOpen);

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Help">
      <p className="text-sm text-secondary">
        Having trouble, or found a bug? Email us at{' '}
        <a href={buildSupportMailto()} className="text-signal underline underline-offset-2">
          {SUPPORT_EMAIL}
        </a>
        . Our team usually responds within 24 hours.
      </p>
    </Modal>
  );
}
