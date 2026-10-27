// Cache only the game shell. No API requests, legal pages or home page are intercepted.
const CACHE = 'tr1stan-packet-flight-pf-3-shell-1';
const FILES = ['/game.html', '/game/pf3/game.css?v=pf3-1', '/game/pf3/api.mjs?v=pf3-1', '/game/pf3/app.mjs?v=pf3-1', '/game/pf3/audio.mjs?v=pf3-1', '/game/pf3/config.mjs?v=pf3-1', '/game/pf3/effects.mjs?v=pf3-1', '/game/pf3/physics.mjs?v=pf3-1', '/game/pf3/render.mjs?v=pf3-1', '/game/pf3/rules.mjs?v=pf3-1', '/game/pf3/security-render.mjs?v=pf3-1', '/game/pf3/storage.mjs?v=pf3-1', '/game/pf3/world.mjs?v=pf3-1', '/style.css?v=31', '/script.js?v=31', '/favicon.svg?v=18', '/fonts/inter-var-latin.woff2', '/fonts/jetbrains-mono-var-latin.woff2'];
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
  if (!['PF2_STORAGE','PF3_STORAGE'].includes(event.data?.type) || !event.ports[0]) return;
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
