const CACHE_NAME = 'wortschatz-v10';
const CACHE_VERSION = '2.0.8';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png'
];

// Install event - cache files
self.addEventListener('install', (event) => {
  console.log('SW: Installing new version...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Cache opened, adding files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('SW: Skip waiting, activate immediately');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean ALL old caches aggressively
self.addEventListener('activate', (event) => {
  console.log('SW: Activating new version...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('SW: Claiming clients');
      return self.clients.claim();
    }).then(() => {
      // Tüm client'lara güncelleme mesajı gönder
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
        });
      });
    })
  );
});

// Fetch event - Network first, then cache (iOS için optimize)
self.addEventListener('fetch', (event) => {
  // Sadece GET isteklerini cache'le
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    // Network first stratejisi (iOS için daha iyi)
    fetch(event.request)
      .then((response) => {
        // Response'u cache'e kaydet
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // Network başarısız olursa cache'den al
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            // Offline fallback
            return caches.match('./index.html');
          });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// iOS için background sync desteği
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Veri senkronizasyonu
      Promise.resolve()
    );
  }
});
