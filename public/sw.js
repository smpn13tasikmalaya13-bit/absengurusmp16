// Nama cache
const CACHE_NAME = 'sabar-absensi-cache-v3';
// Daftar file yang akan di-cache
const urlsToCache = [
  '/',
  '/index.html',
  '/smpn-13-tasikmalaya.png'
  // Aset-aset penting lainnya yang bersifat lokal bisa ditambahkan di sini.
  // URL eksternal (seperti dari CDN) lebih baik di-cache oleh browser secara standar.
];

// Event 'install': menyimpan aset ke cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Event 'fetch': menyajikan aset dari cache jika tersedia, jika tidak, ambil dari jaringan
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Tidak ada di cache, ambil dari jaringan
        return fetch(event.request);
      }
    )
  );
});

// Event 'activate': membersihkan cache lama
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});