/**
 * Service Worker for Bolnee Chatbot
 * Caches AI model and static assets for offline support and persistent caching
 */

const CACHE_NAME = 'bolnee-v3';
const RUNTIME_CACHE = 'bolnee-runtime-v3';

// Files to cache on install (static assets only, not the model)
const urlsToCache = [
  '/',
  '/index.html',
  '/chatbot-widget.js',
  '/index.css',
];

// Model sources - these will be cached when first downloaded
const modelUrls = [
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.0',
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0',
];

// ── Install: Cache static assets ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
      .catch((err) => console.error('[SW] Install error:', err))
  );
});

// ── Activate: Clean up old caches ─────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache-first for static, network-first for API ────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin && !url.hostname.includes('cdn.jsdelivr.net') && !url.hostname.includes('huggingface.co')) {
    return;
  }

  // Cache-first for static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((resp) => {
          if (!resp || resp.status !== 200 || resp.type === 'error') {
            return resp;
          }
          const cache = caches.open(CACHE_NAME);
          cache.then((c) => c.put(request, resp.clone()));
          return resp;
        });
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Network-first for API GETs only — NEVER cache POST or SSE chat streams
  // /api/public/chat is Server-Sent Events (streaming) and must not be intercepted/cached
  if (request.method !== 'GET' || url.pathname.includes('/api/public/chat')) {
    return;
  }
  if (url.pathname.includes('/api/') || url.pathname.includes('/knowledge/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Network-first for CDN resources (model, libs), cache-fallback for offline
  if (url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('huggingface.co')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Return from cache if available
          return caches.match(request).catch(() => {
            // If model, return a placeholder error
            if (url.pathname.includes('model')) {
              return new Response('Model not available offline', { status: 503 });
            }
            return new Response('Offline', { status: 503 });
          });
        })
    );
    return;
  }

  // Default: Network first
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});

// ── Helper: Check if URL is static asset ──────────────────────────────────
function isStaticAsset(pathname) {
  return /\.(js|css|html|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(pathname) ||
         pathname === '/' ||
         pathname === '/index.html';
}
