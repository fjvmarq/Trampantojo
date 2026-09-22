/* Trampantojo — el hilo de la app: pantallas, formularios y lo que se pinta.
   Los números salen de calc.js, lo guardado de store.js y los gráficos de
   charts.js. Aquí sólo se decide qué se enseña y cuándo. */

import * as C from './calc.js?v=0.1.0';
import * as S from './store.js?v=0.1.0';
import { weightChart, rateChart, kg1, signed1, shortDate, longDate } from './charts.js?v=0.1.0';
import { messageOfTheDay } from './messages.js?v=0.1.0';

const VERSION = '0.1.0';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let kcalFmt;
try { kcalFmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' }); }
catch { kcalFmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }); }
const kcal = v => kcalFmt.format(Math.round(v / 10) * 10);
const int = v => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(v);
const dec2 = v => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

// «92,4», «92.4» o «92» → 92.4 ; vacío → NaN
function num(v) {
  if (v == null) return NaN;
  const t = String(v).trim().replace(',', '.');
  return t === '' ? NaN : Number(t);
}

/* ── estado ─────────────────────────────────────────────────────────── */

const loaded = S.load();
let state = loaded.state;
let ui = { range: 90 };
try { ui = { ...ui, ...JSON.parse(localStorage.getItem('trampantojo:ui') || '{}') }; } catch { /* sin preferencias */ }
let current = 'hoy';

const today = () => C.todayISO();

function persist(okText) {
  try {
    S.save(state, today());
    if (okText) toast(okText);
    return true;
  } catch (err) {
    toast(err.message, true);
    return false;
  }
}

function saveUi() {
  try { localStorage.setItem('trampantojo:ui', JSON.stringify(ui)); } catch { /* da igual */ }
}

/* ── utilidades de pantalla ─────────────────────────────────────────── */

let toastTimer;
function toast(msg, isError = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('error', isError);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, isError ? 5000 : 2600);
}

function tag(zone) {
  const s = document.createElement('span');
  s.className = `tag ${zone.status}`;
  const i = document.createElement('i');
  i.setAttribute('aria-hidden', 'true');
  s.append(i, document.createTextNode(zone.label));
  return s;
}

function setSexClass() {
  document.body.classList.toggle('sex-m', state.profile?.sex === 'm');
}

/* ── navegación ─────────────────────────────────────────────────────── */

const SCREENS = ['hoy', 'evolucion', 'registro', 'perfil'];

function go(name, { focus, push = true } = {}) {
  if (!SCREENS.includes(name)) name = 'hoy';
  current = name;
  $$('.screen').forEach(sec => { sec.hidden = sec.id !== `screen-${name}`; });
  $$('.tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.go === name ? 'page' : 'false'));
  $('#screen-title').textContent = name === 'hoy' ? greeting() : $(`#screen-${name}`).dataset.title;
  if (push && location.hash !== `#${name}`) history.pushState(null, '', `#${name}`);
  render();
  if (focus) document.getElementById(focus)?.scrollIntoView({ block: 'start' });
  else window.scrollTo(0, 0);
}

function greeting() {
  const h = new Date().getHours();
  const name = state.profile?.name?.split(' ')[0];
  const hi = h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
  return name ? `${hi}, ${name}` : hi;
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-go]');
  if (!b) return;
  e.preventDefault();
  go(b.dataset.go, { focus: b.dataset.focus });
});

window.addEventListener('popstate', () => go(location.hash.slice(1) || 'hoy', { push: false }));

/* ── render ─────────────────────────────────────────────────────────── */

function render() {
  const s = C.summarize(state, today());
  $('#today-label').textContent = C.parseDate(s.today).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  if (!state.profile) return;          // la bienvenida (o el aviso de datos) está delante
  if (current === 'hoy') renderHoy(s);
  if (current === 'evolucion') renderEvo(s);
  if (current === 'registro') renderLog(s);
  if (current === 'perfil') renderPerfil(s);
}

function renderHoy(s) {
  const p = state.profile;
  $('#screen-title').textContent = greeting();

  // pesarse
  const input = $('#weigh-kg');
  input.placeholder = s.latest ? kg1(s.latest.kg) : '0,0';
  $('#weigh-hint').textContent = !s.latest
    ? 'Por la mañana, después del baño y antes de desayunar.'
    : s.weighedToday
      ? `Hoy ya apuntaste ${kg1(s.latest.kg)} kg. Si vuelves a guardar, se sustituye.`
      : `La última vez: ${kg1(s.latest.kg)} kg, el ${longDate(s.latest.date)}.`;

  // mensaje
  const msg = messageOfTheDay(s, p);
  $('#message-title').textContent = msg.title;
  $('#message-text').textContent = msg.text;

  // tendencia
  $('#hero-kg').textContent = s.hasData ? kg1(s.trendKg) : '—';
  const delta = $('#hero-delta');
  delta.className = 'hero-delta';
  if (!s.hasData) delta.textContent = 'Apunta tu peso para empezar.';
  else if (s.entries.length === 1) delta.textContent = 'Tu punto de partida.';
  else {
    delta.textContent = `${signed1(-s.lostKg)} kg desde el ${shortDate(s.startDate)} (${signed1(-s.lostPct)} %)`;
    if (s.lostKg > 0.05) delta.classList.add('good');
  }
  weightChart($('#chart-hoy'), {
    daily: s.daily, goalKg: p.goalKg, healthy: s.healthy, rangeDays: 30, perWeek: s.rate?.perWeek, compact: true,
  });

  // fichas
  const tiles = $('#tiles');
  tiles.replaceChildren();
  const tile = (label, value, sub, extra) => {
    const d = document.createElement('div');
    d.className = 'tile';
    const l = document.createElement('p'); l.className = 'card-label'; l.textContent = label;
    const v = document.createElement('p'); v.className = 'tile-value'; v.textContent = value;
    d.append(l, v);
    if (extra) d.appendChild(extra);
    if (sub) { const x = document.createElement('p'); x.className = 'tile-sub'; x.textContent = sub; d.appendChild(x); }
    tiles.appendChild(d);
  };

  $('#tiles-label').hidden = !s.hasData;
  if (s.hasData) {
    tile('Ritmo real', s.rate ? `${signed1(s.rate.perWeek)} kg/sem` : '—',
      s.rate ? 'medido en las últimas 3 semanas' : 'hacen falta 4 pesadas en una semana');
    tile('Meta', `${kg1(p.goalKg)} kg`, goalSentence(s, true));
    tile('IMC', kg1(s.bmi), null, tag(s.bmiZone));
    tile(s.maintain ? 'Para mantener' : 'Tu objetivo diario', `${kcal(s.target.kcal)} kcal`,
      s.maintain ? 'lo que gastas al día' : s.target.clipped ? 'el mínimo recomendable' : `para bajar ${kg1(p.rateKgWeek)} kg/semana`);
    tile('Gasto diario', `${kcal(s.tdee)} kcal`, 'estimado con tu actividad');
    tile('Racha', `${s.streak} ${s.streak === 1 ? 'día' : 'días'}`, 'pesándote seguidos');
  }

  const h = state.habits || {};
  $('#habits-nudge').hidden = !!(h.exerciseDays || h.work || h.steps || h.exerciseType);
}

function goalSentence(s, short = false) {
  const pr = s.projection;
  const left = s.trendKg - state.profile.goalKg;
  switch (pr?.status) {
    case 'conseguido': return short ? '¡conseguida!' : '¡Meta conseguida! Ahora el objetivo es mantener.';
    case 'ok': {
      const d = C.parseDate(pr.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', ...(pr.days > 300 ? { year: 'numeric' } : {}) });
      return short ? `a este ritmo, el ${d}` : `A este ritmo llegas a ${kg1(state.profile.goalKg)} kg el ${d}.`;
    }
    case 'estancado': return short ? `te faltan ${kg1(left)} kg` : `Te faltan ${kg1(left)} kg. Ahora mismo la tendencia no baja, así que no hay fecha.`;
    case 'lejos': return short ? 'más de 2 años a este ritmo' : `Te faltan ${kg1(left)} kg: a este ritmo, más de dos años.`;
    default: return short ? `te faltan ${kg1(left)} kg` : `Te faltan ${kg1(left)} kg. Con unas semanas de pesadas te digo cuándo llegas.`;
  }
}

function renderEvo(s) {
  const p = state.profile;
  $$('.segmented button[data-range]').forEach(b => b.setAttribute('aria-checked', String(Number(b.dataset.range) === ui.range)));
  $('#evo-sub').textContent = s.hasData ? goalSentence(s) : '';
  weightChart($('#chart-evo'), {
    daily: s.daily, goalKg: p.goalKg, healthy: s.healthy, rangeDays: ui.range || null, perWeek: s.rate?.perWeek,
  });
  rateChart($('#chart-rate'), s.weekly);

  const facts = $('#facts');
  facts.replaceChildren();
  const fact = (label, value, note, zone) => {
    const wrap = document.createElement('div');
    const dt = document.createElement('dt'); dt.textContent = label;
    const dd = document.createElement('dd');
    const v = document.createElement('span'); v.className = 'fact-value'; v.textContent = value;
    dd.appendChild(v);
    if (zone) dd.appendChild(tag(zone));
    if (note) { const n = document.createElement('small'); n.textContent = note; dd.appendChild(n); }
    wrap.append(dt, dd);
    facts.appendChild(wrap);
  };

  if (s.hasData) {
    fact('Índice de masa corporal', kg1(s.bmi), 'Con tu peso de tendencia. De 18,5 a 24,9 es peso normal.', s.bmiZone);
  }
  fact('Peso saludable para tu altura', `${int(s.healthy[0])} – ${int(s.healthy[1])} kg`, `Con ${int(p.heightCm)} cm, es el peso con el que el IMC queda en la zona normal.`);
  if (s.hasData) {
    fact('Metabolismo basal', `${kcal(s.bmr)} kcal`, 'Lo que gasta tu cuerpo en reposo total (fórmula de Mifflin-St Jeor).');
    fact('Gasto diario', `${kcal(s.tdee)} kcal`, `El basal por tu actividad «${C.ACTIVITY[p.activity]?.label ?? '—'}».`);
    const t = s.target;
    fact(s.maintain ? 'Calorías para mantener' : 'Calorías para tu ritmo', `${kcal(t.kcal)} kcal`,
      s.maintain ? 'Ya estás en tu meta: comer lo que gastas.'
        : t.clipped ? `Tu ritmo pediría ${kcal(t.raw)} kcal, por debajo del mínimo recomendable (${kcal(t.floor)}). Me quedo en el mínimo: bajarás unos ${kg1(t.effectiveRate)} kg por semana.`
          : `${kcal(t.deficit)} kcal menos de lo que gastas: unos ${kg1(p.rateKgWeek)} kg por semana.`);
  }
  fact('Proteína', `${int(s.protein[0])} – ${int(s.protein[1])} g al día`, '1,2 a 1,6 g por kilo de tu peso objetivo. Ayuda a bajar grasa sin perder músculo.');
  fact('Agua', `${kg1(s.waterL)} L al día`, 'Contando la que trae la comida (recomendación de la EFSA).');
  if (s.whtr) fact('Cintura / altura', dec2(s.whtr), `Cintura de ${int(s.waist)} cm. Por debajo de 0,50 es la señal buena.`, s.whtrZone);
  else fact('Cintura / altura', '—', 'Apunta tu cintura al pesarte («Añadir medidas») y lo calculo.');
  if (s.bodyFat != null) fact('Grasa corporal', `${int(s.bodyFat)} %`, 'Estimada con cinta métrica (método de la Marina de EE. UU.). Sirve para ver cómo cambia.', s.bodyFatZone);
  else fact('Grasa corporal', '—', p.sex === 'm' ? 'Apunta cintura, cuello y cadera y la estimo.' : 'Apunta cintura y cuello y la estimo.');
  if (s.hasData && s.entries.length > 1) fact('Cambio desde el inicio', `${signed1(-s.lostKg)} kg`, `Desde el ${shortDate(s.startDate)}: ${signed1(-s.lostPct)} % de tu peso.`);
  fact('Edad', `${s.age} años`, null);
}

function renderLog(s) {
  const list = $('#log');
  list.replaceChildren();
  const trendByDate = new Map((s.daily || []).map(d => [d.date, d.trend]));
  const rows = [...s.entries].reverse();
  $('#log-empty').hidden = rows.length > 0;
  list.hidden = rows.length === 0;
  $('#log-foot').hidden = rows.length === 0;
  rows.forEach((e, i) => {
    const prev = rows[i + 1];
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'log-row';
    b.dataset.date = e.date;
    const main = document.createElement('span'); main.className = 'log-main';
    const date = document.createElement('span'); date.className = 'log-date'; date.textContent = longDate(e.date);
    const sub = document.createElement('span'); sub.className = 'log-sub';
    sub.textContent = `Tendencia ${kg1(trendByDate.get(e.date))} kg` + (e.waist || e.neck || e.hip ? ' · con medidas' : '');
    main.append(date, sub);
    const side = document.createElement('span'); side.className = 'log-side';
    const kg = document.createElement('span'); kg.className = 'log-kg'; kg.textContent = `${kg1(e.kg)} kg`;
    const ch = document.createElement('span'); ch.className = 'log-change'; ch.textContent = prev ? `${signed1(e.kg - prev.kg)} kg` : 'inicio';
    side.append(kg, ch);
    const chev = document.createElement('span'); chev.className = 'chev'; chev.setAttribute('aria-hidden', 'true');
    b.append(main, side, chev);
    li.appendChild(b);
    list.appendChild(li);
  });
}

function renderPerfil(s) {
  fillProfileForm($('#profile-form'));
  fillHabitsForm();
  updateGoalHint($('#profile-form'), $('#goal-hint'));
  updateActivityHint();
  updateHabitsSuggest();
  const last = state.meta?.lastBackup;
  const st = $('#backup-status');
  st.classList.remove('warn');
  if (!last) {
    st.textContent = 'Todavía no has guardado ninguna copia.';
    if (s.entries.length >= 7) st.classList.add('warn');
  } else {
    const days = C.daysBetween(last, s.today);
    st.textContent = `Última copia: ${longDate(last)}${days > 0 ? ` (hace ${days} ${days === 1 ? 'día' : 'días'})` : ' (hoy)'}.`;
    if (days > 14) st.classList.add('warn');
  }
  $('#version').textContent = `Trampantojo ${VERSION} · ${s.entries.length} ${s.entries.length === 1 ? 'pesada' : 'pesadas'} guardadas en este móvil`;
}

/* ── pesarse ────────────────────────────────────────────────────────── */

function readMeasure(form, name) {
  const v = num(form.elements[name]?.value);
  if (Number.isNaN(v)) return undefined;
  if (v < 20 || v > 250) throw new Error(`Revisa la medida de ${name === 'waist' ? 'cintura' : name === 'neck' ? 'cuello' : 'cadera'}: ${form.elements[name].value} cm no parece correcto.`);
  return v;
}

function upsertEntry(entry) {
  const i = state.weights.findIndex(w => w.date === entry.date);
  if (i >= 0) state.weights[i] = { ...state.weights[i], ...entry };
  else state.weights.push(entry);
  state.weights.sort((a, b) => a.date < b.date ? -1 : 1);
}

$('#weigh-form').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.currentTarget;
  const kg = num(f.elements.kg.value);
  if (Number.isNaN(kg) || kg < 25 || kg > 350) {
    toast('Escribe tu peso en kilos, por ejemplo 84,6.', true);
    f.elements.kg.focus();
    return;
  }
  let measures;
  try {
    measures = { waist: readMeasure(f, 'waist'), neck: readMeasure(f, 'neck'), hip: readMeasure(f, 'hip') };
  } catch (err) { toast(err.message, true); return; }
  const entry = { date: today(), kg };
  Object.entries(measures).forEach(([k, v]) => { if (v !== undefined) entry[k] = v; });
  upsertEntry(entry);
  const s = C.summarize(state, today());
  if (persist(`Guardado. Tu tendencia: ${kg1(s.trendKg)} kg`)) {
    f.reset();
    f.querySelector('details').open = false;
    S.askPersistence();
    render();
  }
});

/* ── registro: corregir y borrar ────────────────────────────────────── */

const dlg = $('#edit-dialog');
let editing = null;

function openEdit(date) {
  const f = $('#edit-form');
  f.reset();
  $('#edit-error').textContent = '';
  editing = date;
  const e = date ? state.weights.find(w => w.date === date) : null;
  $('#edit-title').textContent = e ? 'Corregir pesada' : 'Añadir otro día';
  $('#edit-delete').hidden = !e;
  f.elements.date.value = e ? e.date : C.addDays(today(), -1);
  f.elements.date.max = today();
  f.elements.kg.value = e ? kg1(e.kg) : '';
  ['waist', 'neck', 'hip'].forEach(k => { f.elements[k].value = e?.[k] ? String(e[k]).replace('.', ',') : ''; });
  dlg.showModal();
}

$('#log').addEventListener('click', e => {
  const row = e.target.closest('.log-row');
  if (row) openEdit(row.dataset.date);
});
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });   // tocar fuera cierra la hoja
$('#add-past').addEventListener('click', () => openEdit(null));
$('#edit-cancel').addEventListener('click', () => dlg.close());

$('#edit-form').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.currentTarget;
  const err = $('#edit-error');
  const date = f.elements.date.value;
  const kg = num(f.elements.kg.value);
  if (!date || date > today()) { err.textContent = 'Elige un día de hoy hacia atrás.'; return; }
  if (Number.isNaN(kg) || kg < 25 || kg > 350) { err.textContent = 'Escribe el peso en kilos, por ejemplo 84,6.'; return; }
  let measures;
  try {
    measures = { waist: readMeasure(f, 'waist'), neck: readMeasure(f, 'neck'), hip: readMeasure(f, 'hip') };
  } catch (x) { err.textContent = x.message; return; }
  const clash = date !== editing && state.weights.some(w => w.date === date);
  if (clash && !confirm(`Ya hay una pesada el ${longDate(date)}. ¿La sustituyo por esta?`)) return;
  if (editing && editing !== date) state.weights = state.weights.filter(w => w.date !== editing);
  state.weights = state.weights.filter(w => w.date !== date);
  const entry = { date, kg };
  Object.entries(measures).forEach(([k, v]) => { if (v !== undefined) entry[k] = v; });
  upsertEntry(entry);
  if (persist('Guardado.')) { dlg.close(); render(); }
});

$('#edit-delete').addEventListener('click', () => {
  if (!editing) return;
  if (!confirm(`¿Borrar la pesada del ${longDate(editing)}?`)) return;
  state.weights = state.weights.filter(w => w.date !== editing);
  if (persist('Pesada borrada.')) { dlg.close(); render(); }
});

/* ── perfil ─────────────────────────────────────────────────────────── */

function fillActivity(select) {
  if (select.options.length) return;
  Object.entries(C.ACTIVITY).forEach(([k, a]) => {
    const o = document.createElement('option');
    o.value = k;
    o.textContent = a.label;
    select.appendChild(o);
  });
}

function fillProfileForm(f) {
  const p = state.profile;
  fillActivity(f.elements.activity);
  if (!p) return;
  f.elements.name.value = p.name || '';
  f.querySelectorAll('input[name="sex"]').forEach(r => { r.checked = r.value === p.sex; });
  f.elements.birthDate.value = p.birthDate || '';
  f.elements.heightCm.value = p.heightCm ? int(p.heightCm) : '';
  f.elements.goalKg.value = p.goalKg ? kg1(p.goalKg) : '';
  f.elements.rateKgWeek.value = String(p.rateKgWeek ?? 0.5);
  f.elements.activity.value = p.activity || 'sedentario';
}

/* Lee y valida los datos del perfil. Devuelve { data } o { error }. */
function readProfile(f) {
  const name = f.elements.name.value.trim();
  const sex = f.querySelector('input[name="sex"]:checked')?.value;
  const birthDate = f.elements.birthDate.value;
  const heightCm = num(f.elements.heightCm.value);
  const goalKg = num(f.elements.goalKg?.value);
  if (!name) return { error: 'Dime tu nombre.' };
  if (!sex) return { error: 'Elige hombre o mujer: cambia la fórmula del gasto.' };
  if (!birthDate) return { error: 'Falta tu fecha de nacimiento.' };
  const age = C.ageOn(birthDate, today());
  if (age < 14 || age > 100) return { error: 'Revisa la fecha de nacimiento.' };
  if (Number.isNaN(heightCm) || heightCm < 120 || heightCm > 230) return { error: 'Escribe tu altura en centímetros, por ejemplo 178.' };
  const data = { name, sex, birthDate, heightCm };
  if (f.elements.goalKg) {
    if (Number.isNaN(goalKg) || goalKg < 35 || goalKg > 300) return { error: 'Escribe tu peso objetivo en kilos.' };
    data.goalKg = goalKg;
    data.rateKgWeek = Number(f.elements.rateKgWeek.value);
    data.activity = f.elements.activity.value;
  }
  return { data };
}

function updateGoalHint(f, hint) {
  const h = num(f.elements.heightCm.value);
  const goal = num(f.elements.goalKg.value);
  if (Number.isNaN(h) || h < 120 || h > 230) { hint.textContent = ''; return; }
  const [lo, hi] = C.healthyRange(h);
  let t = `Para ${int(h)} cm, el peso saludable va de ${int(lo)} a ${int(hi)} kg.`;
  if (!Number.isNaN(goal) && goal < lo) t += ' Tu objetivo queda por debajo: mejor no bajar de ahí.';
  hint.textContent = t;
}

function updateActivityHint() {
  const f = $('#profile-form');
  const a = C.ACTIVITY[f.elements.activity.value];
  $('#activity-hint').textContent = a ? `Actividad ${a.label.toLowerCase()}: ${a.hint.toLowerCase()}. Tu gasto es tu basal × ${String(a.factor).replace('.', ',')}.` : '';
}

$('#profile-form').addEventListener('input', e => {
  if (['heightCm', 'goalKg'].includes(e.target.name)) updateGoalHint($('#profile-form'), $('#goal-hint'));
  if (e.target.name === 'activity') updateActivityHint();
});

$('#profile-form').addEventListener('submit', e => {
  e.preventDefault();
  const { data, error } = readProfile(e.currentTarget);
  if (error) { toast(error, true); return; }
  state.profile = { ...state.profile, ...data };
  setSexClass();
  if (persist('Datos guardados.')) render();
});

/* ── hábitos ────────────────────────────────────────────────────────── */

const HABIT_FIELDS = ['exerciseType', 'exerciseDays', 'exerciseMinutes', 'work', 'steps', 'oil', 'portions', 'dislikes', 'allergies', 'reasons'];

function fillHabitsForm() {
  const f = $('#habits-form');
  const h = state.habits || {};
  HABIT_FIELDS.forEach(k => { f.elements[k].value = h[k] ?? ''; });
}

function updateHabitsSuggest() {
  const box = $('#habits-suggest');
  box.replaceChildren();
  const h = state.habits || {};
  if (!(h.exerciseDays || h.work || h.steps)) return;
  const sug = C.suggestActivity(h);
  if (!sug || sug === state.profile?.activity) {
    box.textContent = `Tu actividad «${C.ACTIVITY[state.profile?.activity]?.label}» encaja con tus hábitos.`;
    return;
  }
  box.append(`Según tus hábitos, tu actividad sería «${C.ACTIVITY[sug].label}» y ahora tienes «${C.ACTIVITY[state.profile.activity]?.label}». `);
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn tinted small';
  b.textContent = `Usar «${C.ACTIVITY[sug].label}»`;
  b.addEventListener('click', () => {
    state.profile.activity = sug;
    if (persist('Actividad actualizada.')) render();
  });
  box.appendChild(b);
}

$('#habits-form').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.currentTarget;
  const h = {};
  for (const k of HABIT_FIELDS) {
    const v = f.elements[k].value.trim();
    if (v !== '') h[k] = v;
  }
  for (const k of ['exerciseDays', 'exerciseMinutes']) {
    if (h[k] === undefined) continue;
    const n = num(h[k]);
    const max = k === 'exerciseDays' ? 7 : 600;
    if (Number.isNaN(n) || n < 0 || n > max) {
      toast(k === 'exerciseDays' ? 'Días por semana: de 0 a 7.' : 'Minutos: un número, por ejemplo 45.', true);
      return;
    }
    h[k] = n;
  }
  state.habits = h;
  if (persist('Hábitos guardados.')) render();
});

/* ── copia de seguridad ─────────────────────────────────────────────── */

$('#export').addEventListener('click', () => {
  const text = S.exportText(state);
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `trampantojo-copia-${today()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  state.meta = { ...state.meta, lastBackup: today() };
  if (persist('Copia descargada. Guárdala en Drive o mándatela por correo.')) render();
});

$('#import').addEventListener('change', async e => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  let incoming;
  try { incoming = S.parseBackup(await file.text()); }
  catch (err) { toast(err.message, true); return; }
  const n = incoming.weights.length, cur = state.weights.length;
  const ok = confirm(`La copia trae ${n} ${n === 1 ? 'pesada' : 'pesadas'}${incoming.profile?.name ? ` de ${incoming.profile.name}` : ''}. `
    + `Sustituirá lo que hay ahora en el móvil (${cur}). Lo actual queda apartado, no se borra. ¿Seguir?`);
  if (!ok) return;
  S.keepCopy('antes-de-cargar');
  state = incoming;
  setSexClass();
  if (persist('Copia cargada.')) {
    $('#welcome').hidden = !!state.profile;
    render();
  }
});

/* ── primera vez ────────────────────────────────────────────────────── */

function startWelcome() {
  const w = $('#welcome');
  const f = $('#welcome-form');
  fillActivity(f.elements.activity);
  let step = 1;
  const show = () => {
    $$('.step', f).forEach(s => { s.hidden = Number(s.dataset.step) !== step; });
    $('#welcome-back').hidden = step === 1;
    $('#welcome-next').textContent = step === 1 ? 'Continuar' : 'Empezar';
    $('#welcome-error').textContent = '';
  };
  $('#welcome-back').addEventListener('click', () => { step = 1; show(); });
  f.addEventListener('input', () => updateGoalHint(f, $('#welcome-goal-hint')));
  f.addEventListener('submit', e => {
    e.preventDefault();
    const err = $('#welcome-error');
    if (step === 1) {
      const name = f.elements.name.value.trim();
      const sex = f.querySelector('input[name="sex"]:checked')?.value;
      const birth = f.elements.birthDate.value;
      const h = num(f.elements.heightCm.value);
      if (!name) { err.textContent = 'Dime tu nombre.'; return; }
      if (!sex) { err.textContent = 'Elige hombre o mujer: cambia la fórmula del gasto.'; return; }
      if (!birth || C.ageOn(birth, today()) < 14 || C.ageOn(birth, today()) > 100) { err.textContent = 'Revisa la fecha de nacimiento.'; return; }
      if (Number.isNaN(h) || h < 120 || h > 230) { err.textContent = 'Escribe tu altura en centímetros, por ejemplo 178.'; return; }
      step = 2; show();
      updateGoalHint(f, $('#welcome-goal-hint'));
      f.elements.kg.focus();
      return;
    }
    const kg = num(f.elements.kg.value);
    if (Number.isNaN(kg) || kg < 25 || kg > 350) { err.textContent = 'Escribe tu peso de hoy en kilos, por ejemplo 84,6.'; return; }
    const { data, error } = readProfile(f);
    if (error) { err.textContent = error; return; }
    state.profile = { ...data, createdAt: today() };
    upsertEntry({ date: today(), kg });
    setSexClass();
    if (persist(`${data.sex === 'm' ? 'Bienvenida' : 'Bienvenido'}, ${data.name}. Mañana, otra vez a la báscula.`)) {
      w.hidden = true;
      S.askPersistence();
      go('hoy');
    }
  });
  show();
  w.hidden = false;
  setTimeout(() => f.elements.name.focus(), 50);
}

/* ── datos ilegibles ────────────────────────────────────────────────── */

function showStorageAlert() {
  const box = $('#storage-alert');
  box.hidden = false;
  $('main').hidden = true;             // nada que tocar hasta resolverlo
  $('.tabs').hidden = true;
  const hasRaw = typeof loaded.raw === 'string';
  $('#storage-alert-text').textContent = hasRaw
    ? 'No he tocado nada. Descarga lo que había para no perderlo y, después, apártalo para seguir usando la app.'
    : 'Este navegador no deja guardar datos (¿estás en una ventana de incógnito?). Abre Trampantojo en Chrome normal.';
  $('#storage-download').hidden = !hasRaw;
  $('#storage-reset').hidden = !hasRaw;
  $('#storage-download').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([loaded.raw], { type: 'text/plain' }));
    a.download = `trampantojo-ilegible-${today()}.txt`;
    a.click();
  };
  $('#storage-reset').onclick = () => {
    if (!confirm('Lo ilegible queda apartado en el móvil (no se borra) y la app empieza de cero. ¿Seguir?')) return;
    try { S.setAsideUnreadable(loaded.raw); location.reload(); }
    catch (err) { toast('No he podido apartarlo: ' + err.message, true); }
  };
}

/* ── arranque ───────────────────────────────────────────────────────── */

$$('.segmented button[data-range]').forEach(b => b.addEventListener('click', () => {
  ui.range = Number(b.dataset.range);
  saveUi();
  render();
}));

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(render, 150);
});

document.addEventListener('visibilitychange', () => { if (!document.hidden && state.profile) render(); });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.warn('[sw]', err));
}

setSexClass();
if (loaded.status === 'unreadable') showStorageAlert();
else if (!state.profile) startWelcome();
go(location.hash.slice(1) || 'hoy', { push: false });
