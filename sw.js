/**
 * Offline precache for Triplet Tiles. Bump CACHE_NAME when this list or shell assets change.
 * @see lib/tile-types.js TILE_TYPES openmojiHex for SVG filenames.
 */
const CACHE_NAME = 'triplet-tiles-v1';

const PRECACHE_PATHS = [
  'index.html',
  'style.css',
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

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
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
