import { createRoot } from 'react-dom/client';
import { StrictMode, Suspense } from 'react';
import LoadingSpinner from './components/views/LoadingSpinner';
import { lazyWithMinDelay } from './lazyWithMinDelay';
import { isSearchLandingLoad } from './loadingRouteUtils';

const App = lazyWithMinDelay(() => import('./App'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={isSearchLandingLoad() ? null : <LoadingSpinner />}>
      <App />
    </Suspense>
  </StrictMode>,
);
