// PlayGAME — Service Worker (sw.js)
const CACHE = 'playgame-v1.1';
const STATIC = [
  '/',
  '/css/style.css',
  '/css/components.css',
  '/css/animations.css',
  '/css/print.css',
  '/js/app.js',
  '/js/app-extended.js',
  '/js/app-ui.js',
  '/js/brackets.js',
  '/js/payments.js',
  '/js/report.js',
  '/js/router-ext.js',
  '/js/pages-extra.js',
  '/manifest.json'
];

// Instalar e pré-cachear assets estáticos
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

// Ativar e limpar caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Estratégia: Network First para API, Cache First para assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API: sempre network, fallback para offline page
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'Sem conexão. Verifique sua internet.' }), {
          status: 503, headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Uploads: network first com cache
  if (url.pathname.startsWith('/uploads/')) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        fetch(e.request).then(res => {
          cache.put(e.request, res.clone());
          return res;
        }).catch(() => cache.match(e.request))
      )
    );
    return;
  }

  // Assets estáticos: Cache First
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const resClone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, resClone));
        }
        return res;
      }).catch(() => caches.match('/'));
    })
  );
});

// Background sync para comentários offline (futuro)
self.addEventListener('sync', e => {
  if (e.tag === 'sync-comments') {
    console.log('[SW] Sincronizando comentários offline...');
  }
});
