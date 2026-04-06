/**
 * ReadWise Service Worker
 *
 * Strategy:
 *  - App shell (HTML, JS, CSS, fonts, icons): cache-first, update in background
 *  - Navigation requests: network-first, fall back to cached index.html (SPA routing)
 *  - External AI API calls: network-only (never cache — contain secrets / large payloads)
 */

const CACHE = 'readwise-v1';

// External origins we must never intercept
const BYPASS_ORIGINS = [
  'api.anthropic.com',
  'api.openai.com',
  'generativelanguage.googleapis.com',
  'api.deepseek.com',
  'openai.azure.com',
];

// ---------- Install — pre-cache the app shell index ----------
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(['/', '/manifest.webmanifest']))
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ---------- Activate — delete stale caches ----------
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  // Take control of all open clients right away
  self.clients.claim();
});

// ---------- Fetch ----------
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Skip non-GET and non-http(s) requests
  if (req.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // 2. Never intercept external AI API calls
  if (BYPASS_ORIGINS.some(o => url.hostname.includes(o))) return;

  // 3. Navigation requests (page loads / SPA route changes)
  //    → Try network first; if offline, return cached index.html so Angular can route
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          // Cache the fresh index.html for future offline use
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match('/').then(cached => cached ?? new Response('Offline', { status: 503 })))
    );
    return;
  }

  // 4. Same-origin static assets (JS, CSS, fonts, images, icons)
  //    → Cache-first; populate cache on first network hit
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) {
          // Return cached copy and refresh in background (stale-while-revalidate)
          const refresh = fetch(req).then(res => {
            if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
            return res;
          }).catch(() => {});
          // Suppress unused promise warning
          void refresh;
          return cached;
        }
        // Not in cache — fetch, store, and return
        return fetch(req).then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
          return res;
        });
      })
    );
  }
});
