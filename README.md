# LocalDesk

AI that helps with your paperwork without ever seeing your paperwork.

A 100% static, browser-only AI workspace: upload documents and chat with them, with the AI model, your documents, and all processing running entirely on your device. No backend, no database, no account, no document ever transmitted anywhere.

This is a deliberately minimal v1: chat only, one model, completely free. More features land incrementally as they're ready.

## Architecture

- **Static site.** `npm run build` produces a `dist/` folder deployable to any CDN. No server code, no API routes.
- **In-browser inference.** Chat runs on [WebLLM](https://github.com/mlc-ai/web-llm) (WebGPU), embeddings run on [Transformers.js](https://github.com/huggingface/transformers.js). Both execute in Web Workers.
- **Local-only data.** Documents, chunks, embeddings, and chats live in IndexedDB (`src/lib/db.ts`). Onboarding/session flags live in `localStorage`.
- **No network exceptions.** The only network requests LocalDesk ever makes are the one-time AI model download; see [Privacy page](src/pages/PrivacyPage.tsx).

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
npm run preview  # serve the production build locally
```

Requires Chrome/Edge 113+ (or any Chromium browser with WebGPU) to actually run the AI model; see `src/lib/webgpu.ts`.

## Before shipping (manual, human-operator steps)

1. **Hosting/domain.** Point a domain at your static host (Vercel/Netlify/Cloudflare Pages all work with zero server functions).
2. **Support inbox.** Make sure `support@thataibuddy.com` ([`src/lib/support.ts`](src/lib/support.ts)) is a real, monitored inbox before launch; it's surfaced across error states and the Help modal.

## Project structure

```
src/
  lib/            # parsers, chunking, embeddings, WebLLM, RAG, db
  store/          # Zustand stores wiring the above to the UI
  components/     # layout, chat, documents, onboarding, common
  pages/          # LandingPage, AppPage (workspace), SettingsPage, PrivacyPage
  hooks/          # useWebGPUCheck
public/
  sw.js           # offline app-shell caching
```
