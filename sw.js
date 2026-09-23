/* Trampantojo — service worker: que la app funcione sin cobertura.

   Tres decisiones, heredadas de Kids Routines, donde costaron un disgusto:
   · Se guarda fichero a fichero, NO con addAll(): si un fichero falla, addAll
     tira la instalación entera y el móvil se queda con la versión vieja.
   · La red manda para el código (HTML, CSS, JS): así cada versión nueva llega
     sola, y la caché sólo es el respaldo cuando no hay conexión.
   · Las páginas de trabajo (estado, tests) no se guardan nunca: si se guardan,
     se quedan congeladas y uno cree ver lo nuevo cuando ve lo viejo.

   Tus datos NO están aquí: están en localStorage, y este fichero no los toca. */

const CACHE = 'trampantojo-0.12.1';

/* ── los recordatorios de agua ──────────────────────────────────────────
   La app deja en IndexedDB («trampantojo» › «kv» › «agua») lo que hace falta:
   vasos de hoy, objetivo, horario y si está activado o silenciado. Cuando
   Chrome despierta la app (sincronización periódica) se mira si toca avisar, y
   los botones del aviso funcionan sin abrirla: «+1 vaso» lo apunta en ese
   puente (la app lo recoge al abrirse) y «Silenciar para siempre» lo apaga. */

function kvOpen() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('trampantojo', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function kvGet(key) {
  const db = await kvOpen();
  try { return await new Promise((res, rej) => { const q = db.transaction('kv').objectStore('kv').get(key); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
  finally { db.close(); }
}
async function kvPut(key, val) {
  const db = await kvOpen();
  try { await new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(val, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
  finally { db.close(); }
}

const isoDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// la misma regla que js/agua.js (shouldRemind)
function shouldRemind({ hour, count, goal, from, to, every, minsSinceGlass, minsSinceReminder }) {
  if (hour < from || hour >= to) return false;
  if (count >= goal) return false;
  const gap = every * 60;
  const sinceGlass = Math.min(minsSinceGlass ?? Infinity, (hour - from) * 60);
  if (sinceGlass < gap) return false;
  if (minsSinceReminder != null && minsSinceReminder < gap) return false;
  return true;
}

const WATER_ACTIONS = [{ action: 'vaso', title: '+1 vaso' }, { action: 'silenciar', title: 'Silenciar para siempre' }];

function showWater(b) {
  const count = b.day === isoDay() ? b.count || 0 : 0;
  const goal = b.goal || 8;
  return self.registration.showNotification('Un vaso de agua', {
    body: count ? `Llevas ${count} de ${goal} vasos hoy y hace rato que no bebes.` : `Hoy aún no has bebido ningún vaso: te esperan ${goal}.`,
    tag: 'agua', renotify: true, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png',
    actions: WATER_ACTIONS, data: { url: './' },
  });
}

async function tellClients(msg) {
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  list.forEach(c => c.postMessage(msg));
}

// Chrome despierta la app de vez en cuando y aquí se decide si toca.
self.addEventListener('periodicsync', e => {
  if (e.tag !== 'agua') return;
  e.waitUntil((async () => {
    const b = await kvGet('agua').catch(() => null);
    if (!b?.cfg?.on || b.silenced) return;
    const now = new Date();
    const today = b.day === isoDay(now);
    const mins = t => (t ? (Date.now() - t) / 60000 : null);
    const due = shouldRemind({
      hour: now.getHours() + now.getMinutes() / 60, count: today ? b.count || 0 : 0, goal: b.goal || 8,
      from: b.cfg.from, to: b.cfg.to, every: b.cfg.every,
      minsSinceGlass: today ? mins(b.lastGlass) : null, minsSinceReminder: mins(b.lastSent),
    });
    if (!due) return;
    await showWater(b);
    await kvPut('agua', { ...b, lastSent: Date.now() });
  })());
});

self.addEventListener('notificationclick', e => {
  const n = e.notification;
  n.close();
  e.waitUntil((async () => {
    if (n.tag === 'agua' && e.action === 'vaso') {
      const b = (await kvGet('agua').catch(() => null)) || {};
      const day = isoDay();
      const count = (b.day === day ? b.count || 0 : 0) + 1;
      const goal = b.goal || 8;
      await kvPut('agua', { ...b, day, count, pending: (b.day === day ? b.pending || 0 : 0) + 1, lastGlass: Date.now() });
      await tellClients({ type: 'agua', day, count });
      if (count >= goal) await self.registration.showNotification('¡Agua del día completada!', { body: `${count} vasos. Hasta mañana.`, tag: 'agua', silent: true, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png' });
      return;
    }
    if (n.tag === 'agua' && e.action === 'silenciar') {
      const b = (await kvGet('agua').catch(() => null)) || {};
      await kvPut('agua', { ...b, silenced: true, cfg: { ...(b.cfg || {}), on: false } });
      try { await self.registration.periodicSync?.unregister('agua'); } catch { /* no lo tenía */ }
      await tellClients({ type: 'agua-silenciado' });
      return;
    }
    // tocar el aviso: abrir la app (o traerla delante si ya está abierta)
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = list.find(c => new URL(c.url).pathname.startsWith(new URL(self.registration.scope).pathname));
    if (open) return open.focus();
    return self.clients.openWindow(n.data?.url || './');
  })());
});

const FILES = [
  './',
  'index.html',
  'css/app.css?v=0.12.1',
  'js/app.js?v=0.12.1',
  'js/ambient.js?v=0.12.1',
  'js/foods.js?v=0.12.1',
  'js/comidas.js?v=0.12.1',
  'js/antojo.js?v=0.12.1',
  'js/antojo-ui.js?v=0.12.1',
  'js/ideas.js?v=0.12.1',
  'js/logros.js?v=0.12.1',
  'js/calidad.js?v=0.12.1',
  'js/cuerpo.js?v=0.12.1',
  'js/ejercicio.js?v=0.12.1',
  'js/copia.js?v=0.12.1',
  'js/agua.js?v=0.12.1',
  'js/menu.js?v=0.12.1',
  'js/calendario.js?v=0.12.1',
  'js/fotos.js?v=0.12.1',
  'js/fuera.js?v=0.12.1',
  'icons/badge-96.png',
  'js/calc.js?v=0.12.1',
  'js/charts.js?v=0.12.1',
  'js/messages.js?v=0.12.1',
  'js/store.js?v=0.12.1',
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
