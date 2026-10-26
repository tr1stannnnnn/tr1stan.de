// Cache only the game shell. No API requests, legal pages or home page are intercepted.
const CACHE = 'tr1stan-packet-flight-pf-2-shell-2';
const FILES = ['/game.html', '/game/game.css?v=pf2', '/game/api.mjs?v=pf2', '/game/app.mjs?v=pf2', '/game/audio.mjs?v=pf2', '/game/config.mjs?v=pf2', '/game/effects.mjs?v=pf2', '/game/physics.mjs?v=pf2', '/game/render.mjs?v=pf2', '/game/rules.mjs?v=pf2', '/game/security-render.mjs?v=pf2', '/game/storage.mjs?v=pf2', '/game/world.mjs?v=pf2', '/style.css?v=30', '/script.js?v=30', '/favicon.svg?v=18', '/fonts/inter-var-latin.woff2', '/fonts/jetbrains-mono-var-latin.woff2'];
const PATHS = new Set(FILES.map(path => new URL(path, self.location.origin).pathname));
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(path => new Request(path, { cache: 'reload' }))))); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('tr1stan-packet-flight-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !PATHS.has(url.pathname)) return;
  // A network-first shell avoids silently installing stale rules/config on a future release.
  event.respondWith(fetch(event.request, { cache: 'no-cache' }).catch(() => caches.open(CACHE).then(cache => cache.match(event.request, { ignoreSearch: true })).then(response => response || Response.error())));
});
