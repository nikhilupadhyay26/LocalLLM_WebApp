import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <Link to="/" className="mono-tag mb-6 inline-block">
        ← Back
      </Link>
      <h1 className="mb-2 text-2xl font-medium text-primary">Privacy</h1>
      <p className="mb-8 text-sm text-secondary">
        This is a literal account of what PouchLM does and doesn't send over the network, not a marketing summary.
      </p>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-medium text-signal">What never leaves your device</h2>
        <ul className="list-inside list-disc space-y-1.5 text-sm text-primary">
          <li>Every document you upload: the file itself and anything extracted from it</li>
          <li>The text chunks and embeddings generated from your documents</li>
          <li>Every chat message you send and every response the model generates</li>
        </ul>
        <p className="mt-3 text-sm text-secondary">
          All of this lives in your browser's local database (IndexedDB) and never touches a network request. The AI
          models that read your documents and answer questions run inside your browser, using your device's own
          GPU via WebGPU, not on any server, including ours.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-medium text-primary">What about the ~1GB model download?</h2>
        <p className="text-sm text-secondary">
          On first use, PouchLM downloads the AI model itself (a public set of model weights, not anything about
          you) from a content delivery network, the same way any web app downloads its own code and assets. This
          contains no document content and no personal data; it's the software, not your data. It's cached by your
          browser so it only happens once.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-medium text-primary">No accounts, no tracking</h2>
        <p className="text-sm text-secondary">
          PouchLM has no login, no user accounts, and no analytics, cookies, fingerprinting, or third-party embeds
          of any kind.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-primary">You can verify this yourself</h2>
        <p className="text-sm text-secondary">
          The workspace has a live network request log in the top bar. Open your browser's Network tab alongside it
          and you'll see the same thing: nothing but the model download.
        </p>
      </section>
    </div>
  );
}
