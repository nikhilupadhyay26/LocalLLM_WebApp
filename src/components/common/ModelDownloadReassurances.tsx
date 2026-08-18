const REASSURANCES = [
  { icon: '🔒', text: 'Stays on your device, nothing you upload is ever sent anywhere.' },
  { icon: '⚡', text: 'One-time only, instant on every visit after this.' },
  { icon: '📶', text: "Best on Wi-Fi, it's a one-time download, worth doing on a strong connection." },
];

/**
 * Shared between first-run onboarding and switching to a different model
 * mid-session: same reassurance content either time someone is staring at a
 * multi-minute progress bar with nothing else to read. Stays visible for
 * the whole download, not just before it starts.
 */
export default function ModelDownloadReassurances() {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {REASSURANCES.map((item) => (
        <div key={item.text} className="rounded-md border border-ink-700 bg-ink-900 p-3 text-left">
          <span className="mb-1 block text-lg" aria-hidden="true">
            {item.icon}
          </span>
          <p className="text-xs text-secondary">{item.text}</p>
        </div>
      ))}
    </div>
  );
}
