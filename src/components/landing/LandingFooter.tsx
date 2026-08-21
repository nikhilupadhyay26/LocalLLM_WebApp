import { Link } from 'react-router-dom';
import { useUiStore } from '@/store/useUiStore';

/** Shared across the entry, business, and student landing pages so all three read as one site. */
export default function LandingFooter() {
  const setHelpModalOpen = useUiStore((s) => s.setHelpModalOpen);

  return (
    <footer className="border-t border-ink-800 py-8 text-center text-xs text-muted">
      <Link to="/privacy" className="hover:text-secondary">
        Privacy
      </Link>
      <span className="mx-2">·</span>
      <button type="button" onClick={() => setHelpModalOpen(true)} className="hover:text-secondary">
        Help
      </button>
    </footer>
  );
}
