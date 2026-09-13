const CACHE_NAME = 'trading-helper-v3';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './config.js', './manifest.json',
    './apple-touch-icon.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(c) {
                // пофайлово: отсутствие одного файла не должно ронять весь install
                return Promise.all(ASSETS.map(function(a) {
                    return c.add(a).catch(function() {});
                }));
            })
            .then(function() { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys()
            .then(function(names) {
                return Promise.all(names.map(function(n) {
                    if (n !== CACHE_NAME) return caches.delete(n);
                }));
            })
            .then(function() { return self.clients.claim(); })
    );
});

// Стратегия: сначала сеть, при сбое — кэш (актуальные котировки важнее офлайна)
self.addEventListener('fetch', function(e) {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        fetch(e.request)
            .then(function(res) {
                const copy = res.clone();
                caches.open(CACHE_NAME).then(function(c) { c.put(e.request, copy); });
                return res;
            })
            .catch(function() { return caches.match(e.request); })
    );
});
