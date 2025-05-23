const CACHE_NAME = 'notes-app-cache-v3';
const urlsToCache = [
  '/',
  '/index.html',
  'https://kit.fontawesome.com/0ca27f8db1.js',
  '/style.css',
  '/script.js',  
  // If you had external CSS or JS files, list them here.
  // For example: '/css/style.css', '/js/app.js'
];

// Install event—to cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event—to serve cached assets when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached file if found; otherwise, fetch from the network.
        return response || fetch(event.request);
      })
  );
});

// Activate event—to clean up old caches if needed
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
