/* Trampantojo — service worker: que la app funcione sin cobertura.

   Tres decisiones, heredadas de Kids Routines, donde costaron un disgusto:
   · Se guarda fichero a fichero, NO con addAll(): si un fichero falla, addAll
     tira la instalación entera y el móvil se queda con la versión vieja.
   · La red manda para el código (HTML, CSS, JS): así cada versión nueva llega
     sola, y la caché sólo es el respaldo cuando no hay conexión.
   · Las páginas de trabajo (estado, tests) no se guardan nunca: si se guardan,
     se quedan congeladas y uno cree ver lo nuevo cuando ve lo viejo.

   Tus datos NO están aquí: están en localStorage, y este fichero no los toca. */

const CACHE = 'trampantojo-0.8.0';

const FILES = [
  './',
  'index.html',
  'css/app.css?v=0.8.0',
  'js/app.js?v=0.8.0',
  'js/ambient.js?v=0.8.0',
  'js/foods.js?v=0.8.0',
  'js/comidas.js?v=0.8.0',
  'js/antojo.js?v=0.8.0',
  'js/antojo-ui.js?v=0.8.0',
  'js/ideas.js?v=0.8.0',
  'js/logros.js?v=0.8.0',
  'js/calidad.js?v=0.8.0',
  'js/cuerpo.js?v=0.8.0',
  'js/ejercicio.js?v=0.8.0',
  'js/calc.js?v=0.8.0',
  'js/charts.js?v=0.8.0',
  'js/messages.js?v=0.8.0',
  'js/store.js?v=0.8.0',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(FILES.map(async f => {
      try { await cache.add(new Request(f, { cache: 'reload' })); }
      catch (err) { console.warn('[sw] no pude guardar', f, err); }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('trampantojo-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/\/(estado|tests)\.html$/.test(url.pathname)) return;

  const isCode = req.mode === 'navigate' || /\.(html|js|css|webmanifest)$/.test(url.pathname) || url.pathname.endsWith('/');

  if (isCode) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: 'no-cache' });
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      } catch (err) {
        const hit = await caches.match(req);   // sin ignoreSearch: nunca servir un JS de otra versión
        if (hit) return hit;
        if (req.mode === 'navigate') {
          const index = await caches.match('index.html');
          if (index) return index;
        }
        throw err;
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    } catch {
      return new Response('', { status: 504, statusText: 'sin conexión' });
    }
  })());
});
