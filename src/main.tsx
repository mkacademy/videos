import { createRoot } from 'react-dom/client';
import { StrictMode, Suspense } from 'react';
import LoadingSpinner from './components/views/LoadingSpinner';
import { lazyWithMinDelay } from './lazyWithMinDelay';

const App = lazyWithMinDelay(() => import('./App'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<LoadingSpinner />}>
      <App />
    </Suspense>
  </StrictMode>,
);
