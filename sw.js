const CACHE_NAME = 'lankapos-v1';
const STATIC_ASSETS = ['/', '/index.html'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(STATIC_ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => { if (e.request.method !== 'GET') return; e.respondWith(fetch(e.request).then((r) => { const cl = r.clone(); caches.open(CACHE_NAME).then((c) => c.put(e.request, cl)); return r; }).catch(() => caches.match(e.request))); });
