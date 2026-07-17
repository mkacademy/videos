import React from 'react'
import { Provider } from 'react-redux'
import { Route, Routes, BrowserRouter } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import './init'
import { store } from './store'
import ErrorModal from './components/modals/Error'
import NotFound from './components/views/NotFound'
import MediaPrepper from './components/mediaPrepper/mediaPrepper'
import MediaPlayer from './components/mediaPlayer/mediaPlayer'
import MediaPlayerStatusBar from './components/mediaPlayer/MediaPlayerStatusBar'
import HydrationProgressBar from './components/HydrationProgressBar'
import LoadingAnimation from './components/views/Loading'
import Login from './components/convolutions/Login'

const appGlobalCSS = new URL('./styles/appGlobal.css', import.meta.url).href;
const courseGlobalCSS = new URL('./styles/courseGlobal.css', import.meta.url).href;
const pricingTablesGlobalCSS = new URL('./styles/pricingTablesGlobal.css', import.meta.url).href;
const cpanelGlobalCSS = new URL('./styles/cpanelGlobal.css', import.meta.url).href;

function loadCSS(href: string): void {
  const existingLink = document.querySelector(`link[href="${href}"]`);
  if (existingLink) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  const firstStyleSheet = document.querySelector('head > link[rel="stylesheet"]:not([href*="bootstrap"])');
  if (firstStyleSheet) {
    document.head.insertBefore(link, firstStyleSheet);
  } else {
    document.head.appendChild(link);
  }
}

loadCSS(appGlobalCSS);
loadCSS(courseGlobalCSS);
loadCSS(pricingTablesGlobalCSS);
loadCSS(cpanelGlobalCSS);

const mediaRoutes = [
  { path: "/", element: <LoadingAnimation /> },
  { path: "/login", element: <Login /> },
  { path: "/media-player", element: <MediaPlayer /> },
  { path: "/media-prepper", element: <MediaPrepper /> },
  { path: "/*", element: <NotFound /> },
]

function AppShell() {
  return (
    <React.Fragment>
      <BrowserRouter
        basename={process.env.PUBLIC_URL || ''}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          {mediaRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Routes>
        <HydrationProgressBar />
        <MediaPlayerStatusBar />
      </BrowserRouter>
      <ErrorModal />
    </React.Fragment>
  )
}

function App() {
  return (
    <Provider store={store}>
      <AppShell />
    </Provider>
  );
}

export default App
