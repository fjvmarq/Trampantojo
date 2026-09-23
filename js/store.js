/* Trampantojo — dónde se guardan tus datos.

   Todo vive en el navegador del móvil (localStorage), nunca en un servidor.
   Tres reglas, cada una aprendida en otro proyecto a base de perder datos:

   1. Leer tiene TRES respuestas, no dos: hay datos · no hay nada · no he podido
      leer. Si se confunde «no he podido leer» con «no hay nada», el siguiente
      guardado pisa lo que había. Por eso, tras una lectura fallida, `save`
      se niega a escribir.
   2. Antes de escribir, la versión anterior se aparta una vez al día
      (se guardan las últimas 7). Un guardado malo no se lleva la historia.
   3. Los datos llevan número de versión y cada versión nueva de la app sabe
      leer las anteriores (`migrate`). Actualizar nunca borra nada.

   Todas las claves empiezan por «trampantojo:» porque el dominio puede ser
   compartido con otras apps (fjvmarq.github.io aloja más de una). */

const KEY = 'trampantojo:datos';
const SNAP_PREFIX = 'trampantojo:copia:';
const SNAPS_KEPT = 7;
export const SCHEMA = 1;

let lastLoad = 'empty';

export function emptyState() {
  return { schema: SCHEMA, profile: null, habits: {}, weights: [], milestones: [], food: {}, dishes: [], products: {}, recentFoods: [], cravings: [], water: {}, exercise: {}, meta: {} };
}

export function migrate(data) {
  const s = { ...emptyState(), ...data };
  if (!Array.isArray(s.weights)) s.weights = [];
  if (!s.habits || typeof s.habits !== 'object') s.habits = {};
  if (!s.meta || typeof s.meta !== 'object') s.meta = {};
  s.weights = s.weights
    .filter(w => w && typeof w.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w.date) && Number(w.kg) > 0)
    .map(w => ({ ...w, kg: Number(w.kg) }));
  if (!Array.isArray(s.milestones)) s.milestones = [];
  s.milestones = s.milestones.filter(m => m && /^\d{4}-\d{2}-\d{2}$/.test(m.date) && Number(m.kg) > 0)
    .map(m => ({ ...m, kg: Number(m.kg) }));
  // comidas (desde la 0.4): por día, cada apunte con sus kcal ya calculadas
  if (!s.food || typeof s.food !== 'object' || Array.isArray(s.food)) s.food = {};
  for (const [d, arr] of Object.entries(s.food)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !Array.isArray(arr)) { delete s.food[d]; continue; }
    s.food[d] = arr.filter(e => e && Number(e.kcal) >= 0).map(e => ({ ...e, kcal: Number(e.kcal) }));
  }
  if (!Array.isArray(s.dishes)) s.dishes = [];
  if (!s.products || typeof s.products !== 'object' || Array.isArray(s.products)) s.products = {};
  if (!Array.isArray(s.recentFoods)) s.recentFoods = [];
  // agua (desde la 0.7): vasos por día
  if (!s.water || typeof s.water !== 'object' || Array.isArray(s.water)) s.water = {};
  // ejercicio (desde la 0.9): por día, cada apunte con sus minutos y kcal estimadas
  if (!s.exercise || typeof s.exercise !== 'object' || Array.isArray(s.exercise)) s.exercise = {};
  for (const [d, arr] of Object.entries(s.exercise)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !Array.isArray(arr)) { delete s.exercise[d]; continue; }
    s.exercise[d] = arr.filter(e => e && e.act && Number(e.minutes) > 0)
      .map(e => ({ ...e, minutes: Number(e.minutes), kcal: Number(e.kcal) || 0 }));
    if (!s.exercise[d].length) delete s.exercise[d];
  }
  // antojos (desde la 0.5): cuándo, qué, cómo estabas y cómo acabó
  if (!Array.isArray(s.cravings)) s.cravings = [];
  s.cravings = s.cravings.filter(c => c && c.id && typeof c.date === 'string' && Number.isFinite(c.hour));
  // el plan empieza, si no se dijo otra cosa, en la primera pesada
  if (s.profile && !s.profile.plan && s.weights.length) {
    const first = [...s.weights].sort((a, b) => a.date < b.date ? -1 : 1)[0];
    s.profile = { ...s.profile, plan: { startDate: first.date, startKg: first.kg } };
  }
  // la meta lleva fecha desde la 0.3: si no la tiene, sale del ritmo que se eligió
  if (s.profile && !s.profile.goalDate && s.profile.plan && s.profile.rateKgWeek > 0 && s.profile.plan.startKg > s.profile.goalKg) {
    const days = Math.ceil((s.profile.plan.startKg - s.profile.goalKg) / (s.profile.rateKgWeek / 7));
    const d = new Date(s.profile.plan.startDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    const pad = n => String(n).padStart(2, '0');
    s.profile = { ...s.profile, goalDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` };
  }
  // (aquí irán los pasos de schema 1 → 2 → …, sin quitar nunca campos que no se conozcan)
  s.schema = SCHEMA;
  return s;
}

/* Devuelve { state, status } con status = 'found' | 'empty' | 'unreadable'. */
export function load() {
  let raw;
  try {
    raw = localStorage.getItem(KEY);
  } catch (err) {
    lastLoad = 'unreadable';
    return { state: emptyState(), status: 'unreadable', error: String(err) };
  }
  if (raw == null) {
    lastLoad = 'empty';
    return { state: emptyState(), status: 'empty' };
  }
  try {
    const state = migrate(JSON.parse(raw));
    lastLoad = 'found';
    return { state, status: 'found' };
  } catch (err) {
    lastLoad = 'unreadable';
    return { state: emptyState(), status: 'unreadable', error: String(err), raw };
  }
}

export function canSave() {
  return lastLoad !== 'unreadable';
}

/* Tras una lectura fallida: aparta lo ilegible (no se borra) y deja empezar. */
export function setAsideUnreadable(raw, now = new Date()) {
  if (raw != null) {
    // si no se puede apartar, no se toca: mejor bloqueado que borrado
    localStorage.setItem('trampantojo:ilegible:' + now.toISOString(), raw);
    localStorage.removeItem(KEY);
  }
  lastLoad = 'empty';
}

export function save(state, today) {
  if (!canSave()) throw new Error('No se guarda: los datos anteriores no se pudieron leer y se perderían.');
  const next = JSON.stringify({ ...state, schema: SCHEMA });
  try {
    const prev = localStorage.getItem(KEY);
    if (prev && prev !== next && today) snapshot(prev, today);
    localStorage.setItem(KEY, next);
    lastLoad = 'found';
  } catch (err) {
    throw new Error('El móvil no ha dejado guardar: ' + (err?.message || err));
  }
}

function snapshot(raw, today) {
  const key = SNAP_PREFIX + today;
  if (localStorage.getItem(key) != null) return;     // una por día basta
  try {
    localStorage.setItem(key, raw);
  } catch { /* sin sitio para la copia: el guardado principal sigue */ }
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(SNAP_PREFIX)) keys.push(k);
  }
  keys.sort().slice(0, Math.max(0, keys.length - SNAPS_KEPT)).forEach(k => localStorage.removeItem(k));
}

export function snapshots() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(SNAP_PREFIX)) out.push(k.slice(SNAP_PREFIX.length));
    }
  } catch { /* nada que listar */ }
  return out.sort().reverse();
}

/* Aparta una copia de lo guardado ahora mismo (p. ej. antes de cargar una copia). */
export function keepCopy(tag, now = new Date()) {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) localStorage.setItem(`trampantojo:${tag}:${now.toISOString()}`, raw);
    return true;
  } catch {
    return false;
  }
}

/* ── copia de seguridad en fichero ──────────────────────────────────── */

export function exportText(state, now = new Date()) {
  return JSON.stringify({
    app: 'Trampantojo',
    schema: SCHEMA,
    exportedAt: now.toISOString(),
    data: state,
  }, null, 2);
}

/* Lee un fichero de copia. Lanza un error con una frase para el usuario si
   el fichero no es una copia de Trampantojo. */
export function parseBackup(text) {
  let obj;
  try { obj = JSON.parse(text); }
  catch { throw new Error('El fichero no es una copia de Trampantojo (no se puede leer).'); }
  if (!obj || obj.app !== 'Trampantojo' || !obj.data) {
    throw new Error('El fichero no es una copia de Trampantojo.');
  }
  if (obj.schema > SCHEMA) {
    throw new Error('La copia es de una versión más nueva de la app. Actualiza la app y vuelve a probar.');
  }
  return migrate(obj.data);
}

export async function askPersistence() {
  try {
    if (navigator.storage?.persisted && await navigator.storage.persisted()) return true;
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch { /* el navegador no lo ofrece */ }
  return false;
}
