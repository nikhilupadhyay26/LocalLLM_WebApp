import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import LandingPage from '@/pages/LandingPage';
import BusinessLandingPage from '@/pages/BusinessLandingPage';
import StudentLandingPage from '@/pages/StudentLandingPage';
import PrivacyPage from '@/pages/PrivacyPage';
import HelpModal from '@/components/common/HelpModal';

// The landing page must load instantly (PRD Section 7). The workspace pulls
// in WebLLM, Transformers.js, pdf.js, and mammoth (multiple megabytes), so
// it's split into its own chunk, fetched only once someone actually opens
// the app.
const AppPage = lazy(() => import('@/pages/AppPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));

function RouteFallback() {
  return <div className="flex min-h-screen items-center justify-center text-muted">Loading…</div>;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/business" element={<BusinessLandingPage />} />
        <Route path="/students" element={<StudentLandingPage />} />
        <Route
          path="/app"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AppPage />
            </Suspense>
          }
        />
        <Route
          path="/app/settings"
          element={
            <Suspense fallback={<RouteFallback />}>
              <SettingsPage />
            </Suspense>
          }
        />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Routes>
      {/* Rendered once, globally: Help is a modal, not a route, so closing
          it always reveals whatever screen was underneath instead of
          navigating anywhere (was landing on "/" every time). */}
      <HelpModal />
    </>
  );
}
