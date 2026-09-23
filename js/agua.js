/* Trampantojo — los recordatorios de agua.

   Si llevas un rato sin beber, una notificación te lo recuerda, con dos
   botones en la propia notificación: «+1 vaso» (lo apunta sin abrir la app) y
   «Silenciar para siempre» (lo apaga y quita el despertador de Chrome: no
   vuelve a sonar).

   Quién decide CUÁNDO avisar (shouldRemind, más abajo, la misma regla aquí y
   en el service worker): dentro de tu horario, si no has llegado a tu agua y hace más de X
   horas del último vaso (o del último aviso).

   Con la app cerrada — la parte difícil en Android: una web no puede programar
   alarmas. Chrome la despierta por su cuenta con la «sincronización periódica»
   cuando él decide (en la práctica, una o dos veces al día), y entonces se mira
   si toca avisar. Para avisos a una hora fija haría falta un servidor que los
   mandara; se decidió no tenerlo (2026-09-23), así que es lo que hay.

   El service worker no puede leer localStorage: por eso lo que necesita (vasos
   de hoy, objetivo, horario, silenciado) se le deja en IndexedDB, y los vasos
   que apuntes desde la notificación se recogen al abrir la app. */

export const DEFAULTS = { on: false, from: 10, to: 21, every: 2 };

/* ── la regla, igual aquí que en el service worker ──────────────────── */

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
          cfg: { ...cfg, on: cfg.on && !silenced }, id: undefined, pushUrl: undefined,
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

// Activar: el permiso de notificaciones y el despertador de Chrome (sincronización periódica).
export async function enable() {
  const perm = await askPermission();
  if (perm !== 'granted') return { ok: false, perm };
  await clearSilenced();
  const reg = await navigator.serviceWorker.ready;
  let periodic = false;
  try {
    if (reg.periodicSync) {
      const st = await navigator.permissions.query({ name: 'periodic-background-sync' });
      if (st.state === 'granted') { await reg.periodicSync.register('agua', { minInterval: 60 * 60 * 1000 }); periodic = true; }
    }
  } catch { /* no lo soporta: da igual */ }
  return { ok: true, perm, periodic };
}

export async function disable() {
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.periodicSync?.unregister('agua');
  } catch { /* da igual */ }
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
