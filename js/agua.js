/* Trampantojo — los recordatorios de agua.

   Si llevas un rato sin beber, una notificación te lo recuerda, con dos
   botones en la propia notificación: «+1 vaso» (lo apunta sin abrir la app) y
   «Silenciar para siempre» (y no vuelve a sonar: además de apagarlo, se da de
   baja la suscripción, así que ni un servidor podría insistir).

   Quién decide CUÁNDO avisar (shouldRemind, más abajo, la misma regla en todas
   partes): dentro de tu horario, si no has llegado a tu agua y hace más de X
   horas del último vaso (o del último aviso).

   Cómo llega el aviso con la app cerrada — la parte difícil en Android:
   · Una web no puede programar alarmas. Con la app cerrada, Chrome sólo la
     despierta por su cuenta con la «sincronización periódica», que decide él
     (en la práctica, una o dos veces al día). Eso es lo que hay sin servidor.
   · Para que llegue a su hora hace falta un servidor pequeño que mande el aviso
     (web push). Está escrito en worker/ (Cloudflare, gratis); cuando esté
     publicado, PUSH_URL apunta a él y la app se da de alta sola. Sólo recibe un
     código aleatorio, tu horario y cuántos vasos llevas: ni tu nombre ni tu peso.

   El service worker no puede leer localStorage: por eso lo que necesita (vasos
   de hoy, objetivo, horario, silenciado) se le deja en IndexedDB, y los vasos
   que apuntes desde la notificación se recogen al abrir la app. */

export const PUSH_URL = '';            // p. ej. 'https://trampantojo-agua.<cuenta>.workers.dev'
export const VAPID_PUBLIC = '';        // la clave pública del servidor (base64url)

export const DEFAULTS = { on: false, from: 10, to: 21, every: 2 };

/* ── la regla, igual aquí que en el service worker y en el servidor ──── */

// hour: hora local con decimales (14.5 = 14:30)
export function shouldRemind({ hour, count, goal, from, to, every, minsSinceGlass, minsSinceReminder }) {
  if (hour < from || hour >= to) return false;
  if (count >= goal) return false;
  const gap = every * 60;
  const sinceWindow = (hour - from) * 60;
  // el reloj empieza con tu horario: el vaso de anoche no cuenta como «hace 12 horas»
  const sinceGlass = Math.min(minsSinceGlass ?? Infinity, sinceWindow);
  if (sinceGlass < gap) return false;
  if (minsSinceReminder != null && minsSinceReminder < gap) return false;
  return true;
}

// Cuántos vasos «tocaría» llevar a esta hora, repartiendo el objetivo en tu horario.
export function expectedByNow(hour, goal, from, to) {
  if (hour <= from) return 0;
  if (hour >= to) return goal;
  return Math.floor(goal * (hour - from) / (to - from));
}

/* ── IndexedDB: lo que el service worker necesita saber ─────────────── */

const DB = 'trampantojo', STORE = 'kv', KEY = 'agua';

function idb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function kv(mode, fn) {
  const db = await idb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
export const readBridge = () => kv('readonly', s => s.get(KEY)).catch(() => null);
const writeBridge = v => kv('readwrite', s => s.put(v, KEY)).catch(() => null);

/* Deja al service worker lo que necesita y recoge lo que pasó mientras tanto:
   los vasos apuntados desde la notificación van en «pending» (sólo los suyos,
   no una cuenta total: así quitar un vaso en la app no lo resucita el puente).
   Todo en una sola transacción, para no perder un toque que llegue a la vez. */
export async function syncBridge({ day, count, goal, cfg, lastGlass }) {
  if (typeof indexedDB === 'undefined') return { count, added: 0, silenced: false };
  const db = await idb().catch(() => null);
  if (!db) return { count, added: 0, silenced: false };
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      let out;
      const q = store.get(KEY);
      q.onsuccess = () => {
        const prev = q.result || {};
        const sameDay = prev.day === day;
        const added = sameDay ? prev.pending || 0 : 0;
        const silenced = !!prev.silenced;
        const glass = Math.max(lastGlass || 0, sameDay ? prev.lastGlass || 0 : 0);
        out = { count: count + added, added, silenced, lastGlass: glass };
        store.put({
          ...prev, day, count: count + added, pending: 0, goal, lastGlass: glass,
          cfg: { ...cfg, on: cfg.on && !silenced }, id: deviceId(), pushUrl: PUSH_URL,
        }, KEY);
      };
      tx.oncomplete = () => resolve(out);
      tx.onerror = () => reject(tx.error);
    });
  } catch { return { count, added: 0, silenced: false }; }
  finally { db.close(); }
}

// Al volver a activar los avisos a mano, se olvida el «silenciado».
export async function clearSilenced() {
  const prev = (await readBridge()) || {};
  await writeBridge({ ...prev, silenced: false });
}

/* ── permiso, suscripción y el aviso de prueba ──────────────────────── */

export const supported = () => typeof Notification !== 'undefined' && 'serviceWorker' in navigator;

export async function askPermission() {
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

function b64urlToBytes(s) {
  const pad = '='.repeat((4 - s.length % 4) % 4);
  const bin = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

// Un código aleatorio para este móvil (el servidor no sabe nada más de ti).
export function deviceId() {
  try {
    let id = localStorage.getItem('trampantojo:dispositivo');
    if (!id) {
      id = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem('trampantojo:dispositivo', id);
    }
    return id;
  } catch { return null; }
}

async function post(path, body) {
  if (!PUSH_URL) return false;
  try {
    const r = await fetch(`${PUSH_URL}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return r.ok;
  } catch { return false; }
}

// Activar: permiso, suscripción push (si hay servidor) y la sincronización periódica de respaldo.
export async function enable(cfg, day, count, goal) {
  const perm = await askPermission();
  if (perm !== 'granted') return { ok: false, perm };
  await clearSilenced();
  const reg = await navigator.serviceWorker.ready;
  let push = false;
  if (PUSH_URL && VAPID_PUBLIC && reg.pushManager) {
    try {
      const sub = (await reg.pushManager.getSubscription())
        || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlToBytes(VAPID_PUBLIC) });
      push = await post('/alta', { id: deviceId(), sub, cfg: { ...cfg, goal, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }, day, count });
    } catch (err) { console.warn('[agua] push', err); }
  }
  let periodic = false;
  try {
    if (reg.periodicSync) {
      const st = await navigator.permissions.query({ name: 'periodic-background-sync' });
      if (st.state === 'granted') { await reg.periodicSync.register('agua', { minInterval: 60 * 60 * 1000 }); periodic = true; }
    }
  } catch { /* no lo soporta: da igual */ }
  return { ok: true, perm, push, periodic };
}

export async function disable() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager?.getSubscription();
    if (sub) await sub.unsubscribe();
    await reg.periodicSync?.unregister('agua');
  } catch { /* da igual */ }
  await post('/baja', { id: deviceId() });
}

// Cada vaso se cuenta también al servidor, para que no avise si acabas de beber.
export function reportGlass(day, count) {
  return post('/vaso', { id: deviceId(), day, count, t: Date.now() });
}
export function reportSettings(cfg, goal) {
  return post('/ajustes', { id: deviceId(), cfg: { ...cfg, goal, tz: Intl.DateTimeFormat().resolvedOptions().timeZone } });
}

// Un aviso ahora mismo, para ver cómo es y probar sus botones.
export async function testNotification(count, goal) {
  const reg = await navigator.serviceWorker.ready;
  return reg.showNotification('Un vaso de agua', {
    body: `Llevas ${count} de ${goal} vasos hoy. Toca «+1 vaso» cuando lo bebas.`,
    tag: 'agua', renotify: true, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png',
    actions: [{ action: 'vaso', title: '+1 vaso' }, { action: 'silenciar', title: 'Silenciar para siempre' }],
    data: { url: './' },
  });
}
