import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { I18nProvider } from './i18n/I18nContext.jsx';
import { setupOnlineListener } from './lib/syncEngine.js';
import './index.css';

// Register offline/sync listener (SRS FR-24, NFR 5.5).
const unsubscribeSync = setupOnlineListener();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
);

// Register the service worker for PWA offline support (SRS FR-24).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
      return;
    }

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations
        .filter((registration) => new URL(registration.scope).origin === window.location.origin)
        .forEach((registration) => registration.unregister());
    });
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('nhfas-shell-')).map((key) => caches.delete(key)),
    ));
  });
}
