// HRT药典 Service Worker — offline cache for critical safety pages only
const CACHE_NAME = 'yakuten-v2';
const CRITICAL_PAGES = [
  '/zh/',
  '/zh/risks/',
  '/zh/blood-tests/',
  '/zh/pathway/',
  '/zh/china-reality/',
  '/en/risks/',
  '/ja/risks/',
  '/ko/risks/',
];

// Install: pre-cache critical pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CRITICAL_PAGES))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: only serve from cache for critical pages, everything else goes to network
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Only use cache for critical pages
  if (CRITICAL_PAGES.includes(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // All other requests: network only, no caching
});
