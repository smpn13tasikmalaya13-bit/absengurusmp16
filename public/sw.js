// A more robust service worker to ensure proper PWA lifecycle and caching.
const CACHE_NAME = 'sabar-absensi-cache-v10'; // Version bump is crucial
const urlsToCache = [
  '/',
  '/index.html',
  '/smpn-13-tasikmalaya.svg',
  '/icon-monochrome.svg',
];

// --- INSTALL: Cache critical assets and activate immediately ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker.
        return self.skipWaiting();
      })
  );
});

// --- ACTIVATE: Clean up old caches and take control of clients ---
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log(`[SW] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Tell the active service worker to take control of the page immediately.
      return self.clients.claim();
    })
  );
});

// --- FETCH: Network falling back to cache strategy ---
self.addEventListener('fetch', (event) => {
  // Let the browser handle non-GET requests and browser extensions.
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  // Don't cache Firebase requests; let the SDK handle its own offline persistence.
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebase')) {
      return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return fetch(event.request)
        .then((response) => {
          // If the request is successful, update the cache.
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch((err) => {
          // If the network request fails, try to get it from the cache.
          return cache.match(event.request).then((response) => {
            return response; // Will be undefined if not in cache.
          });
        });
    })
  );
});