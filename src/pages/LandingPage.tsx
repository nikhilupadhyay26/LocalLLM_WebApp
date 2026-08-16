import { Link } from 'react-router-dom';
import { useUiStore } from '@/store/useUiStore';

const STEPS = [
  {
    title: 'Upload your documents',
    body: "PDFs, contracts, invoices, whatever you're working with.",
  },
  {
    title: 'We download a small AI model',
    body:
      "Just once, about 1GB, similar to installing an app. This is what lets everything run right here on your device instead of on someone else's server.",
  },
  {
    title: 'Chat and search, completely private',
    body: 'Because the AI runs locally, nothing you upload is ever sent anywhere. Every visit after the first is instant.',
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

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-16 lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
        <div className="flex flex-col items-center text-center">
          <p className="mono-tag mb-4 inline-block">100% local · No account required</p>
          <h1 className="mb-5 text-[2.5rem] font-medium !leading-tight tracking-tight text-primary sm:text-4xl lg:text-5xl">
            Chat With Your Documents
            <span className="block">Analyze Paperwork Locally</span>
            <span className="block">Keep Your Data Secure</span>
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-base text-secondary lg:text-lg">
            Chat with and search your invoices, contracts, and customer files. Nothing ever leaves your device.
            Everything runs locally.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/app" className="btn-primary !px-6 !py-3 text-[15px]">
              Launch Local Assistant
            </Link>
            <a href="#how-it-works" className="btn-secondary !px-6 !py-3 text-[15px]">
              See How it works
            </a>
          </div>
          <p className="mt-4 text-xs text-muted">No signup required to start</p>
        </div>

        <div className="mt-12 flex justify-center lg:mt-0 lg:justify-end">
          <img
            src="/rightimage.png"
            alt="PouchLM Interface"
            className="h-auto w-full max-w-[700px] object-contain select-none"
            draggable={false}
            style={{
              clipPath: 'inset(4% 4% 15% 4%)',
              WebkitMaskImage: 'radial-gradient(ellipse 95% 95% at 50% 50%, black 80%, transparent 100%)',
              maskImage: 'radial-gradient(ellipse 95% 95% at 50% 50%, black 80%, transparent 100%)'
            }}
          />
        </div>
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
