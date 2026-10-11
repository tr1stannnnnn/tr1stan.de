// Cache only the game shell. No API requests, legal pages or home page are intercepted.
const CACHE = 'tr1stan-packet-flight-pf-1-shell-1';
const FILES = ['/game.html', '/game/game.css', '/game/app.mjs', '/game/rules.mjs', '/game/physics.mjs', '/game/storage.mjs', '/game/audio.mjs', '/game/render.mjs', '/game/api.mjs', '/game/config.mjs', '/style.css?v=19', '/script.js?v=19', '/favicon.svg?v=18', '/fonts/inter-var-latin.woff2', '/fonts/jetbrains-mono-var-latin.woff2'];
const PATHS = new Set(FILES.map(path => new URL(path, self.location.origin).pathname));
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('tr1stan-packet-flight-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !PATHS.has(url.pathname)) return;
  // A network-first shell avoids silently installing stale rules/config on a future release.
  event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then(cache => cache.match(event.request, { ignoreSearch: true })).then(response => response || Response.error())));
});
