import { Link } from 'react-router-dom';
import { clearStoredPersona } from '@/lib/landingPersona';

/** Shared across the entry, business, and student landing pages so all three read as one site. */
export default function LandingHeader() {
  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
      {/* The entry page (/) redirects straight back to whichever persona
          page was last chosen, so a plain link here would silently bounce
          right back instead of acting like a normal "go home" logo click. */}
      <Link
        to="/"
        onClick={clearStoredPersona}
        className="flex items-center gap-3 text-xl font-semibold text-primary"
      >
        <img src="/icon.png" alt="" className="h-11 w-11 rounded-md" />
        PouchLM
      </Link>
      <nav className="flex items-center gap-4 text-sm text-secondary">
        <Link to="/privacy" className="hover:text-primary">
          Privacy
        </Link>
        <Link to="/app" className="btn-primary !px-4 !py-1.5">
          Try it Locally
        </Link>
      </nav>
    </header>
  );
}
