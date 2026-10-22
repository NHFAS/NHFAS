// NHFAS service worker — offline-first baseline (SRS FR-24, NFR 5.5).
// Cache strategy:
//   - App shell (HTML, manifest, favicon, CSS/JS chunks): cache-first
//   - Same-origin API (Supabase): network-first, offline fallback to cached
//     responses where available; non-GET requests pass through and fail fast
//   - Cross-origin (Supabase, fonts, images): network-only, never cached
// Bump CACHE whenever core shell assets change.

const CACHE = 'nhfas-shell-v3';
const API_CACHE = 'nhfas-api-v1';
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg'];

// API path prefixes that may be cached for offline reads.
const API_READ_PREFIXES = ['/rest/', '/functions/'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => undefined),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE && key !== API_CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never interfere with cross-origin traffic (Supabase, external fonts, etc.).
  if (url.origin !== self.location.origin) return;
  if (request.method !== 'GET' && request.method !== 'HEAD') return;

  // App shell navigation — network-first, fallback to cached shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  // Same-origin API reads — network-first with offline cache fallback.
  const isApiRead = API_READ_PREFIXES.some((p) => url.pathname.startsWith(p));
  if (isApiRead && request.method === 'GET') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || new Response(JSON.stringify({ error: 'offline', offline: true }), { status: 503, headers: { 'Content-Type': 'application/json' } }))),
    );
    return;
  }

  // Static assets — cache-first (Vite hashes filenames, safe to cache).
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
        }
        return response;
      });
    }),
  );
});

// Background sync: replay pending writes when connectivity returns.
// Requires the 'background-sync' permission / Chrome 80+.
self.addEventListener('sync', (event) => {
  if (event.tag === 'nhfas-offline-sync') {
    event.waitUntil(
      fetch('/api/offline-sync', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
        .then(() => undefined)
        .catch(() => undefined),
    );
  }
});
