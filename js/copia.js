/* Trampantojo — la copia automática.

   Tus datos viven en el navegador. Si un día borras los datos de Chrome,
   desinstalas la app o cambias de móvil, se irían con él. Por eso, además de
   las copias internas de cada día, la app guarda SOLA una copia en una carpeta
   del móvil que eliges una vez (Documentos, Descargas…): esa carpeta no se
   borra con Chrome.

   · Chrome para Android deja escribir en una carpeta elegida desde la versión
     132 (File System Access). El permiso se da una vez; si el navegador lo
     olvida al cerrarse, un aviso en Hoy lo pide otra vez con un toque (nunca
     se pide por sorpresa en mitad de otra cosa).
   · Se escribe `trampantojo-copia.json` (siempre la última) y, una vez por
     semana, `trampantojo-AAAA-MM-DD.json`, para poder volver atrás. Nunca se
     borra nada: si un día la copia última saliera mal, las semanales siguen.
   · Una copia vacía no pisa nunca a una buena.
   · Donde el navegador no sabe escribir en carpetas, cada semana la app te
     propone guardarla con un toque (compartir → Drive, correo…). */

const DB = 'trampantojo', STORE = 'kv', KEY = 'carpeta-copia';
const LAST = 'trampantojo:copia-auto';          // ISO de la última copia automática
const WEEKLY = 'trampantojo:copia-semanal';     // fecha de la última copia con fecha
const ASKED = 'trampantojo:copia-pedido';       // día en que se pidió el permiso por última vez

export const LATEST_NAME = 'trampantojo-copia.json';

export function canUseFolder() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function' && typeof indexedDB !== 'undefined';
}

/* ── un almacén mínimo en IndexedDB: el «puntero» a la carpeta no cabe en
   localStorage (es un objeto del navegador, no texto) ─────────────────── */

function idb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function idbDo(mode, fn) {
  const db = await idb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
const getHandle = () => idbDo('readonly', s => s.get(KEY));
const setHandle = h => idbDo('readwrite', s => s.put(h, KEY));
const delHandle = () => idbDo('readwrite', s => s.delete(KEY));

const ls = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento: da igual */ } },
};

/* ── lo que se sabe de la copia ahora mismo ──────────────────────────── */

// { supported, folder: nombre|null, perm: 'granted'|'prompt'|'denied'|null, last: Date|null }
export async function status() {
  const last = ls.get(LAST) ? new Date(ls.get(LAST)) : null;
  if (!canUseFolder()) return { supported: false, folder: null, perm: null, last };
  let h = null;
  try { h = await getHandle(); } catch { /* IndexedDB no disponible */ }
  if (!h) return { supported: true, folder: null, perm: null, last };
  let perm = 'prompt';
  try { perm = await h.queryPermission({ mode: 'readwrite' }); } catch { /* navegador viejo */ }
  return { supported: true, folder: h.name, perm, last };
}

/* ── elegir la carpeta (necesita un toque del usuario) ──────────────── */

export async function chooseFolder(text, today) {
  const h = await window.showDirectoryPicker({ id: 'trampantojo-copia', mode: 'readwrite', startIn: 'documents' });
  await setHandle(h);
  return write(h, text, today, true);
}

export async function forgetFolder() {
  await delHandle();
}

/* ── escribir la copia ───────────────────────────────────────────────── */

async function writeFile(dir, name, text) {
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(text);
  await w.close();
}

async function write(h, text, today, forceWeekly = false) {
  await writeFile(h, LATEST_NAME, text);
  const lastWeekly = ls.get(WEEKLY);
  let dated = null;
  if (forceWeekly || !lastWeekly || daysBetween(lastWeekly, today) >= 7) {
    dated = `trampantojo-${today}.json`;
    await writeFile(h, dated, text);
    ls.set(WEEKLY, today);
  }
  ls.set(LAST, new Date().toISOString());
  return { ok: true, folder: h.name, dated };
}

/* Guarda la copia si hay carpeta y permiso. Con gesture=true (dentro de un
   toque) puede pedir el permiso, como mucho una vez al día.
   Devuelve { ok, reason: 'sin-carpeta'|'permiso'|'vacia'|'error', folder } */
export async function autoBackup(text, { today, gesture = false, explicit = false, hasData = true } = {}) {
  if (!hasData) return { ok: false, reason: 'vacia' };
  if (!canUseFolder()) return { ok: false, reason: 'sin-carpeta' };
  let h;
  try { h = await getHandle(); } catch { return { ok: false, reason: 'error' }; }
  if (!h) return { ok: false, reason: 'sin-carpeta' };
  try {
    let perm = await h.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted' && gesture && (explicit || ls.get(ASKED) !== today)) {
      ls.set(ASKED, today);
      perm = await h.requestPermission({ mode: 'readwrite' });
    }
    if (perm !== 'granted') return { ok: false, reason: 'permiso', folder: h.name };
    return await write(h, text, today);
  } catch (err) {
    console.warn('[copia]', err);
    return { ok: false, reason: 'error', folder: h.name };
  }
}

/* Las fotos, como .jpg en «trampantojo-fotos» dentro de la carpeta de la
   copia. Sólo las que aún no estén; nunca se borra ninguna. */
export async function writePhotos(photos, getBlob) {
  if (!photos?.length || !canUseFolder()) return 0;
  let h;
  try { h = await getHandle(); } catch { return 0; }
  if (!h || (await h.queryPermission({ mode: 'readwrite' })) !== 'granted') return 0;
  let written = 0;
  try {
    const dir = await h.getDirectoryHandle('trampantojo-fotos', { create: true });
    for (const p of photos) {
      const name = `${p.date}-${p.id}.jpg`;
      try { await dir.getFileHandle(name); continue; } catch { /* no está: se escribe */ }
      const blob = await getBlob(p.id);
      if (!blob) continue;
      const fh = await dir.getFileHandle(name, { create: true });
      const w = await fh.createWritable();
      await w.write(blob);
      await w.close();
      written++;
    }
  } catch (err) { console.warn('[copia] fotos', err); }
  return written;
}

// ¿Toca copia? (la última hace más de `hours` horas)
export function due(hours = 12) {
  const last = ls.get(LAST);
  return !last || (Date.now() - new Date(last).getTime()) > hours * 3600000;
}

/* ── plan B: compartir el fichero (Drive, correo…) ──────────────────── */

export async function shareOrDownload(text, today) {
  const name = `trampantojo-copia-${today}.json`;
  const file = typeof File === 'function' ? new File([text], name, { type: 'application/json' }) : null;
  if (file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Copia de Trampantojo' });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}

function daysBetween(a, b) {
  const t = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((t(b) - t(a)) / 86400000);
}
