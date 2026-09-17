// CMMS Espert - service worker
// Estaticos: network-first con fallback a cache (asi los deploys se ven al toque
// y la app abre offline con la ultima version). API: siempre red, sin cache.
const CACHE = 'cmms-v1';
const PRECACHE = ['/', '/backoffice.html', '/qr.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;       // CDN (qrcode) y externos: no se tocan
  if (url.pathname.startsWith('/api/') || url.pathname === '/health') return; // API: red directa

  event.respondWith(
    fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: url.pathname.endsWith('.html') }))
  );
});
