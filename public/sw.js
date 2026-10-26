const CACHE = 'finanzas-v2';
const STATIC_FILES = ['/', '/app.js', '/styles.css', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png'];
const cacheable = response => response.ok && !response.redirected && response.type !== 'opaqueredirect';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => Promise.all(STATIC_FILES.map(async url => {
    const response = await fetch(url);
    if (!cacheable(response)) throw new Error(`No se puede cachear ${url}`);
    await cache.put(url, response);
  }))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('finanzas-') && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const index = event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html';
  const data = url.pathname.startsWith('/data/');
  const key = index ? '/' : event.request;
  event.respondWith(caches.open(CACHE).then(async cache => {
    if (!index && !data) {
      const cached = await cache.match(key); if (cached) return cached;
    }
    try {
      const response = await fetch(index ? '/' : event.request);
      if (cacheable(response)) await cache.put(key, response.clone());
      return response;
    } catch {
      return (await cache.match(key)) || new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  }));
});
