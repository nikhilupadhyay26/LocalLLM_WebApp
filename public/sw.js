// Minimal offline-caching service worker. It caches the app shell (the
// static build output) so PouchLM loads instantly and works offline on
// repeat visits. The AI model itself is cached separately by the browser's
// standard Cache Storage, managed by @mlc-ai/web-llm and
// @huggingface/transformers; this worker doesn't need to know about it.

// Every cache this worker creates is named with this prefix. Cleanup below
// only ever touches caches matching it, never a bare exact-name exclusion:
// the AI model's own caches (webllm/*, transformers-cache) live in the same
// origin-wide Cache Storage and share no naming scheme with this worker, so
// a broader "delete anything that isn't my current name" filter would wipe
// a user's already-downloaded model on every app-shell cache bump, forcing
// a full re-download for no reason connected to the model at all.
const CACHE_PREFIX = 'pouchlm-shell-';
const CACHE_NAME = `${CACHE_PREFIX}v2`;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never intercept cross-origin (model asset) requests

  // Network-First strategy for HTML documents (ensures we always get the newest version)
  if (request.mode === 'navigate' || request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-First (Stale-While-Revalidate) strategy for other assets (JS, CSS, Images)
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached ?? networkFetch;
    }),
  );
});
