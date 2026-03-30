/* ═══════════════════════════════════════════════════════════
   DAILY ACTIVITY MONITOR — Service Worker (sw.js)
   Enables PWA install on Android and iOS.
   Caches static assets so the app shell loads offline.
   ═══════════════════════════════════════════════════════════ */

var CACHE_NAME = 'dam-v1';

/* Static files to cache on install */
var STATIC_ASSETS = [
  './',
  './index.html',
  './home.html',
  './login.html',
  './register.html',
  './personal-dashboard.html',
  './group-dashboard.html',
  './my-profile.html',
  './manage-profile.html',
  './contact.html',
  './verify.html',
  './verify-pending.html',
  './forgot-password.html',
  './reset-password.html',
  './styles.css',
  './calendar.css',
  './main.js',
  './session.js',
  './supabase-config.js',
  './login.js',
  './register.js',
  './personal-dashboard.js',
  './group-dashboard.js',
  './manage-profile.js',
  './forgot-password.js',
  './reset-password.js',
  './create-group.js',
  'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap'
];

/* ── Install: cache all static assets ──────────────────── */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* ── Activate: clean up old caches ─────────────────────── */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* ── Fetch: network-first for Supabase, cache-first for static */
self.addEventListener('fetch', function (event) {
  var url = event.request.url;

  /* Always go network for Supabase API calls */
  if (url.includes('supabase.co') || url.includes('supabase.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  /* Cache-first strategy for static assets */
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        /* Cache new static responses */
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function () {
        /* If offline and not cached, show offline fallback */
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
