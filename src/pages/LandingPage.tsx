import { Link, Navigate } from 'react-router-dom';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import { getStoredPersona, setStoredPersona } from '@/lib/landingPersona';

const CARDS = [
  {
    persona: 'business' as const,
    to: '/business',
    icon: '💼',
    title: 'For Business',
    body: 'Keep your documents private. Invoices, contracts, and customer files, processed locally, never uploaded anywhere.',
  },
  {
    persona: 'students' as const,
    to: '/students',
    icon: '🎓',
    title: 'For Students',
    body: 'Free AI, no subscription, no catch. Runs right in your browser, at zero cost.',
  },
];

export default function LandingPage() {
  // A returning visitor who already picked a side lands straight back on
  // their page instead of this selector every time.
  const storedPersona = getStoredPersona();
  if (storedPersona === 'business') return <Navigate to="/business" replace />;
  if (storedPersona === 'students') return <Navigate to="/students" replace />;

  return (
    <div className="min-h-screen">
      <LandingHeader />

      <main className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="mb-4 text-4xl font-medium !leading-tight tracking-tight text-primary sm:text-5xl">
          AI that runs entirely in your browser
        </h1>
        <p className="mx-auto mb-12 max-w-xl text-base text-secondary lg:text-lg">
          No servers, no uploads, nothing sent anywhere. See what that means for you:
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          {CARDS.map((card) => (
            <Link
              key={card.persona}
              to={card.to}
              onClick={() => setStoredPersona(card.persona)}
              className="card flex flex-col items-center p-6 text-center transition-colors hover:border-signal"
            >
              <span className="mb-3 text-3xl" aria-hidden="true">
                {card.icon}
              </span>
              <h2 className="mb-2 text-lg font-medium text-primary">{card.title}</h2>
              <p className="text-sm text-secondary">{card.body}</p>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-xs text-muted">
          <Link to="/app" className="underline underline-offset-2 hover:text-secondary">
            Just take me to the app
          </Link>
        </p>
      </main>

      <LandingFooter />
    </div>
  );
}
