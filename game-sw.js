// Cache only the game shell. No API requests, legal pages or home page are intercepted.
const CACHE = 'tr1stan-packet-flight-pf-2-shell-5';
const FILES = ['/game.html', '/game/game.css?v=pf2-start2', '/game/api.mjs?v=pf2-start2', '/game/app.mjs?v=pf2-start2', '/game/audio.mjs?v=pf2-privacy1', '/game/config.mjs?v=pf2-online1', '/game/effects.mjs?v=pf2-privacy1', '/game/physics.mjs?v=pf2-privacy1', '/game/render.mjs?v=pf2-privacy1', '/game/rules.mjs?v=pf2-privacy1', '/game/security-render.mjs?v=pf2-privacy1', '/game/storage.mjs?v=pf2-privacy1', '/game/world.mjs?v=pf2-privacy1', '/style.css?v=31', '/script.js?v=31', '/favicon.svg?v=18', '/fonts/inter-var-latin.woff2', '/fonts/jetbrains-mono-var-latin.woff2'];
const PATHS = new Set(FILES.map(path => new URL(path, self.location.origin).pathname));
const MARKER = new URL('/game/.offline-choice', self.location.origin).href;
const consented = () => caches.match(MARKER, { cacheName: CACHE }).then(Boolean);
const clearShells = () => caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('tr1stan-packet-flight-')).map(key => caches.delete(key))));
// An upgrade of an old automatic worker installs no optional files.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const allowed = await consented();
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => key.startsWith('tr1stan-packet-flight-') && (!allowed || key !== CACHE)).map(key => caches.delete(key)));
  await self.clients.claim();
})()));
let storageTask = Promise.resolve();
self.addEventListener('message', event => {
  if (event.data?.type !== 'PF2_STORAGE' || !event.ports[0]) return;
  storageTask = storageTask.catch(() => {}).then(async () => {
    try {
      if (event.data.enabled === true) {
        const cache = await caches.open(CACHE);
        await cache.addAll(FILES.map(path => new Request(path, { cache: 'reload' })));
        // Commit authorization only once the complete shell is available.
        await cache.put(MARKER, new Response('chosen'));
      } else {
        await clearShells();
        await self.registration.unregister();
      }
      event.ports[0].postMessage({ ok: true });
    } catch {
      await clearShells();
      event.ports[0].postMessage({ ok: false });
    }
  });
  event.waitUntil(storageTask);
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !PATHS.has(url.pathname)) return;
  event.respondWith((async () => {
    // match() does not create a cache after revocation, even in a controlled tab.
    if (!await consented()) return fetch(event.request);
    return fetch(event.request, { cache: 'no-cache' }).catch(async () =>
      await caches.match(event.request, { cacheName: CACHE, ignoreSearch: true }) || Response.error());
  })());
});
