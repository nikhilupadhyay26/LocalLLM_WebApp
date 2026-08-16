import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { installNetworkMonitor } from '@/lib/networkMonitor';

// Installed before anything else renders so the network indicator badge
// (Section 13) sees every request the app ever makes, including the model
// download.
installNetworkMonitor();

// Only in production: a service worker caching Vite's dev-server module
// requests corrupts HMR (stale chunks served across restarts, mismatched
// module instances). It has no reason to run against `vite dev` anyway.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline caching is a progressive enhancement: the app still
      // works without it, just re-downloads the model each session.
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
