const CACHE_NAME = 'migraapp-v1.4';
const ASSETS = [
  '/index.html',
  '/css/main.css',
  '/css/components.css',
  '/js/storage.js?v=4',
  '/js/auth.js?v=4',
  '/js/migraine.js?v=4',
  '/js/ui.js?v=4',
  '/js/calendar.js?v=4',
  '/js/pdf.js?v=4',
  '/js/dashboard.js?v=4',
  '/js/app.js?v=4',
  '/manifest.json',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('[SW] Error caching assets:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  // Skip CDN requests (jsPDF, Chart.js) - let them go through network
  if (event.request.url.includes('cdn') || event.request.url.includes('unpkg')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      }).catch(() => {
        // Fallback to index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
