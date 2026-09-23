/* Trampantojo — las fotos de progreso.

   La báscula dice cuánto; la foto dice cómo. Cuando el peso se atasca, dos
   fotos con un mes de diferencia suelen enseñar lo que el número no.

   · Se quedan SÓLO en el móvil (IndexedDB «trampantojo» › «kv»), reducidas a
     1280 px en JPEG para que no ocupen (unos 150–250 KB cada una), con una
     miniatura aparte para la rejilla.
   · En la lista del estado (state.photos) sólo va la fecha y el peso de ese
     día; la imagen no entra en la copia en JSON (la haría enorme). Si tienes la
     copia automática en una carpeta, las fotos se guardan allí como .jpg, en
     «trampantojo-fotos». */

const DB = 'trampantojo', STORE = 'kv';

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
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}

export const getPhoto = id => kv('readonly', s => s.get(`foto:${id}`));
export const getThumb = id => kv('readonly', s => s.get(`foto-mini:${id}`));

// Una imagen reducida (la orientación de la cámara la respeta createImageBitmap).
export async function shrink(file, max, quality = 0.82) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('No he podido leer la foto.'))), 'image/jpeg', quality));
}

// Guarda la foto (grande y miniatura) y devuelve su ficha para la lista.
export async function addPhoto(file, date, kg) {
  const [big, mini] = await Promise.all([shrink(file, 1280), shrink(file, 360, 0.75)]);
  const id = `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  await kv('readwrite', s => { s.put(big, `foto:${id}`); return s.put(mini, `foto-mini:${id}`); });
  return { id, date, kg: kg ?? null, bytes: big.size };
}

export async function deletePhoto(id) {
  await kv('readwrite', s => { s.delete(`foto:${id}`); return s.delete(`foto-mini:${id}`); });
}

// Para la comparación: la primera y la última, salvo que se elijan otras.
export function defaultPair(photos) {
  const list = [...(photos || [])].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return list.length >= 2 ? [list[0], list[list.length - 1]] : null;
}
