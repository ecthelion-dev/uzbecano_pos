/**
 * OrderPlus POS service worker.
 *
 * A till has to keep working when the internet drops mid-shift, so the app
 * itself must load from disk. What it must never do is serve a stale answer
 * about the business: an order, a table's status or a price read from cache
 * would let a cashier act on something that is no longer true.
 *
 * So the split is strict:
 *   /api/*                — network only, never touched, never stored
 *   /assets/* (hashed)    — cache first; the filename changes when the build does
 *   navigations           — network first, cache as the offline fallback
 */
const SHELL_CACHE = 'orderplus-pos-shell-v1';
const ASSET_CACHE = 'orderplus-pos-assets-v1';
const KNOWN_CACHES = [SHELL_CACHE, ASSET_CACHE];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(['/', '/index.html', '/manifest.json']))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !KNOWN_CACHES.includes(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Anything about orders, tables, products or staff comes from the server or
  // not at all. A cached copy here is worse than an error the cashier can see.
  if (url.pathname.startsWith('/api/')) return;

  // Cross-origin (the API host, fonts) is left to the browser.
  if (url.origin !== self.location.origin) return;

  // Vite fingerprints these, so a cached file can never be the wrong version.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(ASSET_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Navigations: prefer the network so a deploy is picked up on the next
  // reload, fall back to the last good copy when there is no network.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html').then((hit) => hit || Response.error()))
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request).then((hit) => hit || Response.error()))
  );
});
