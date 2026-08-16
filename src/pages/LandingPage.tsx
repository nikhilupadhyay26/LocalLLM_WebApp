import { Link } from 'react-router-dom';
import { useUiStore } from '@/store/useUiStore';

const STEPS = [
  {
    title: 'Upload',
    body: 'Drop in invoices, contracts, customer records: PDF, DOCX, CSV, or TXT. Parsing happens in your browser.',
  },
  {
    title: 'Ask',
    body: 'Chat with your documents and get answers grounded in what they actually say. Nothing is sent anywhere to do it.',
  },
  {
    title: 'Keep working',
    body: 'Everything is saved locally and picks up right where you left off, even offline, on your next visit.',
  },
];

export default function LandingPage() {
  const setHelpModalOpen = useUiStore((s) => s.setHelpModalOpen);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3 text-xl font-semibold text-primary">
          <img src="/icon.png" alt="" className="h-11 w-11 rounded-md" />
          PouchLM
        </div>
        <nav className="flex items-center gap-4 text-sm text-secondary">
          <Link to="/privacy" className="hover:text-primary">
            Privacy
          </Link>
          <Link to="/app" className="btn-primary !px-4 !py-1.5">
            Try it Locally
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-16 text-center">
        <p className="mono-tag mb-4">100% local · No account required</p>
        <h1 className="mb-5 text-[2.75rem] font-medium !leading-relaxed tracking-tight text-primary sm:text-5xl">
          Chat With Your Documents
          <br />
          Analyze Paperwork Locally
          <br />
          Keep Your Data Secure
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-secondary">
          Chat with and search your invoices, contracts, and customer files. Nothing ever leaves your device.
          Everything runs locally.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/app" className="btn-primary !px-6 !py-3">
            Launch Local Assistant
          </Link>
          <a href="#how-it-works" className="btn-secondary !px-6 !py-3">
            See How it works
          </a>
        </div>
        <p className="mt-4 text-xs text-muted">No signup required to start</p>
      </main>

      <section id="how-it-works" className="border-y border-ink-800 bg-ink-900/40 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="mono-tag mb-8 text-center">See How it works</p>
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="card p-5">
                <span className="mono-tag text-signal">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mb-1 mt-2 text-primary">{step.title}</h3>
                <p className="text-sm text-secondary">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="mono-tag mb-3">The privacy promise</p>
        <p className="mx-auto max-w-xl text-primary">
          Nothing ever leaves your device. Everything runs locally. The full picture is on the{' '}
          <Link to="/privacy" className="text-signal underline underline-offset-2">
            Privacy page
          </Link>
          .
        </p>
      </section>

      <footer className="border-t border-ink-800 py-8 text-center text-xs text-muted">
        <Link to="/privacy" className="hover:text-secondary">
          Privacy
        </Link>
        <span className="mx-2">·</span>
        <button type="button" onClick={() => setHelpModalOpen(true)} className="hover:text-secondary">
          Help
        </button>
      </footer>
    </div>
  );
}
