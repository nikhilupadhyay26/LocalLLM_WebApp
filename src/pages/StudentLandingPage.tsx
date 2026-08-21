import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import { clearStoredPersona, setStoredPersona } from '@/lib/landingPersona';

const WHY_FREE = [
  {
    title: 'No servers to run',
    body: "Everything happens right in your browser. There's no cloud AI processing your requests behind the scenes.",
  },
  {
    title: 'No cost to pass on',
    body: "We're not paying for API calls or server time on your behalf, so there's no bill to recoup with a subscription.",
  },
  {
    title: 'So it stays free',
    body: 'Not a trial or "free for now." There\'s no infrastructure cost behind this that would ever need covering.',
  },
];

const USE_CASES = [
  'Summarize a long reading before class',
  'Turn lecture notes or a textbook chapter into a study guide',
  'Ask questions about a PDF instead of rereading the whole thing',
  'Use it as much as you want, no cost pressure',
];

export default function StudentLandingPage() {
  // Remembers the choice so a returning visitor lands straight back here
  // instead of the persona selector every time (see LandingPage.tsx).
  useEffect(() => {
    setStoredPersona('students');
  }, []);

  return (
    <div className="min-h-screen">
      <LandingHeader />

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-16 text-center">
        <p className="mono-tag mb-4 inline-block">100% local · Always free</p>
        <h1 className="mb-5 text-[2.5rem] font-medium !leading-tight tracking-tight text-primary sm:text-4xl lg:text-5xl">
          Free AI. No subscription.
          <span className="block">No catch.</span>
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-base text-secondary lg:text-lg">
          It runs entirely on your own device instead of a server, so there's no ongoing cost to pass on to you.
          That's the whole reason it can be free: not a promotion, just how it works.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/app" className="btn-primary !px-6 !py-3 text-[15px]">
            Try it now, free forever.
          </Link>
          <a href="#why-free" className="btn-secondary !px-6 !py-3 text-[15px]">
            See what you can do with it
          </a>
        </div>
        <p className="mt-4 text-xs text-muted">No signup required to start</p>
      </main>

      <section id="why-free" className="border-y border-ink-800 bg-ink-900/40 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="mono-tag mb-8 text-center">Why it's actually free</p>
          <div className="grid gap-6 sm:grid-cols-3">
            {WHY_FREE.map((item) => (
              <div key={item.title} className="card p-5">
                <h3 className="mb-1 text-primary">{item.title}</h3>
                <p className="text-sm text-secondary">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="mono-tag mb-6">What you can use it for</p>
        <ul className="mx-auto max-w-xl space-y-3 text-left">
          {USE_CASES.map((item) => (
            <li key={item} className="flex items-start gap-3 text-secondary">
              <span className="mt-1 text-signal" aria-hidden="true">
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="mono-tag mb-3">The free promise</p>
        <p className="mx-auto max-w-xl text-primary">
          No subscription, no trial period, no catch. It works this way because everything runs locally, see the{' '}
          <Link to="/privacy" className="text-signal underline underline-offset-2">
            Privacy page
          </Link>{' '}
          for how.
        </p>
        <p className="mx-auto mt-6 max-w-xl text-xs text-muted">
          Here for something else?{' '}
          <Link to="/" onClick={clearStoredPersona} className="underline underline-offset-2 hover:text-secondary">
            See both options
          </Link>
        </p>
      </section>

      <LandingFooter />
    </div>
  );
}
