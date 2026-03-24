/**
 * Offline precache for Triplet Tiles. Bump CACHE_NAME when this list or shell assets change.
 * @see lib/tile-types.js TILE_TYPES openmojiHex for SVG filenames.
 */
const CACHE_NAME = 'triplet-tiles-v4';

const PRECACHE_PATHS = [
  'index.html',
  'style.css',
  'assets/phosphor/regular/style.css',
  'assets/phosphor/regular/Phosphor.woff2',
  'manifest.webmanifest',
  'icon.svg',
  'sw.js',
  'game.js',
  'tile-layering.js',
  'levels.generated.js',
  'lib/game-model.js',
  'lib/board-view.js',
  'lib/tile-types.js',
  'lib/audio-service.js',
  'assets/wood-grain-noise.webp',
  'assets/audio/music_ambient_loop_01.mp3',
  'assets/openmoji/ATTRIBUTION.txt',
  'assets/openmoji/1F332.svg',
  'assets/openmoji/1F338.svg',
  'assets/openmoji/1F347.svg',
  'assets/openmoji/2B50.svg',
  'assets/openmoji/1F330.svg',
  'assets/openmoji/1F344.svg',
  'assets/openmoji/1F352.svg',
  'assets/openmoji/1F98B.svg',
  'assets/openmoji/1F33B.svg',
  'assets/openmoji/1F34E.svg',
  'assets/openmoji/1F955.svg',
  'assets/openmoji/1F41E.svg'
];

function absolutePrecacheUrls(scope) {
  return PRECACHE_PATHS.map((p) => new URL(p, scope).href);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const scope = self.registration.scope;
      const cache = await caches.open(CACHE_NAME);
      const urls = absolutePrecacheUrls(scope);
      await Promise.allSettled(
        urls.map(async (href) => {
          try {
            const res = await fetch(href);
            if (res.ok) await cache.put(href, res);
            else console.warn('[triplet-sw] precache not ok', href, res.status);
          } catch (e) {
            console.warn('[triplet-sw] precache failed', href, e);
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => (key === CACHE_NAME ? Promise.resolve() : caches.delete(key))));
      await self.clients.claim();
    })()
  );
});

/**
 * App shell JS and HTML must not be cache-first forever, or soft reloads serve stale
 * `game.js` while the DOM from `index.html` may be updated — e.g. icon markup replaced by old JS.
 * Network-first when online; precache still warms the cache for offline.
 */
function shouldNetworkFirst(req) {
  if (req.mode === 'navigate') return true;
  const url = new URL(req.url);
  if (url.origin !== new URL(self.registration.scope).origin) return false;
  const p = url.pathname;
  return p.endsWith('.js') || p.endsWith('.html');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      if (shouldNetworkFirst(req)) {
        try {
          const res = await fetch(req);
          if (res.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(req, res.clone());
          }
          return res;
        } catch (e) {
          const cached = await caches.match(req);
          if (cached) return cached;
          if (req.mode === 'navigate') {
            const indexUrl = new URL('index.html', self.registration.scope).href;
            const fallback = await caches.match(indexUrl);
            if (fallback) return fallback;
          }
          throw e;
        }
      }

      const cached = await caches.match(req);
      if (cached) return cached;

      try {
        return await fetch(req);
      } catch (e) {
        if (req.mode === 'navigate') {
          const indexUrl = new URL('index.html', self.registration.scope).href;
          const fallback = await caches.match(indexUrl);
          if (fallback) return fallback;
        }
        throw e;
      }
    })()
  );
});
