const CACHE = 'urlaub-v10';
const CDN_CACHE = 'fernweh-cdn-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];
// CDN-Hosts, deren Dateien sich nicht ändern → cache-first (Globus, Fonts, Erdtextur)
const CDN_HOSTS = ['unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== CDN_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  if (url.origin !== self.location.origin) {
    // Sync- und Geo-APIs müssen immer live ans Netz
    if (CDN_HOSTS.includes(url.hostname)) {
      e.respondWith(
        caches.open(CDN_CACHE).then(async c => {
          const hit = await c.match(e.request);
          if (hit) return hit;
          const resp = await fetch(e.request);
          if (resp.ok || resp.type === 'opaque') c.put(e.request, resp.clone()).catch(() => {});
          return resp;
        }).catch(() => fetch(e.request))
      );
    }
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
