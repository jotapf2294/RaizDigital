/* Horta PWA service worker */
const CACHE = 'horta-v3';
const SCOPE_URL = new URL('./', self.location).href;
const HTML_URL  = new URL('./index.html', self.location).href;

const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Cache each individually so a single failure doesn't abort the whole install.
    await Promise.all(CORE.map(async (u) => {
      try { await cache.add(new Request(u, { cache: 'reload' })); }
      catch (err) { console.warn('[SW] precache failed:', u, err && err.message); }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.disable(); } catch {}
    }
    await self.clients.claim();
  })());
});

async function cachedHtml() {
  const cache = await caches.open(CACHE);
  return (await cache.match(HTML_URL))
      || (await cache.match(SCOPE_URL))
      || (await cache.match('./index.html'))
      || (await cache.match('./'));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, fall back to cached shell when offline.
  if (req.mode === 'navigate' || (req.destination === '' && req.headers.get('accept')?.includes('text/html'))) {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE);
        // Keep multiple keys in sync so offline always finds the shell.
        cache.put(req, res.clone()).catch(() => {});
        cache.put(HTML_URL, res.clone()).catch(() => {});
        cache.put(SCOPE_URL, res.clone()).catch(() => {});
        return res;
      } catch {
        const shell = await cachedHtml();
        if (shell) return shell;
        return new Response(
          '<!doctype html><meta charset=utf-8><title>Offline</title><body style="background:#0d1117;color:#c9d1d9;font-family:system-ui;padding:24px">Offline. Reconecte e recarregue.</body>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  // Same-origin static assets: stale-while-revalidate.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const fetchAndCache = fetch(req).then((res) => {
      if (res && res.status === 200 && (res.type === 'basic' || res.type === 'default')) {
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    }).catch(() => null);
    if (cached) { fetchAndCache; return cached; }
    const fresh = await fetchAndCache;
    if (fresh) return fresh;
    // Last resort for asset requests: if it's an icon/manifest, reuse cache by pathname.
    const pathMatch = await cache.match(url.pathname.replace(/^\//, './')).catch(() => null);
    if (pathMatch) return pathMatch;
    return new Response('Offline', { status: 503 });
  })());
});

// Allow the page to ask the SW to refresh itself.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
