/* Trampantojo — el hilo de la app: pantallas, formularios y lo que se pinta.
   Los números salen de calc.js, lo guardado de store.js y los gráficos de
   charts.js. Aquí sólo se decide qué se enseña y cuándo. */

import * as C from './calc.js?v=0.10.0';
import * as S from './store.js?v=0.10.0';
import { weightChart, rateChart, kcalChart, measureChart, kg1, signed1, shortDate, longDate } from './charts.js?v=0.10.0';
import { initComidas } from './comidas.js?v=0.10.0';
import { initAntojo, renderCravingCard } from './antojo-ui.js?v=0.10.0';
import { waterGoal, evaluateBadges, weekSummary } from './logros.js?v=0.10.0';
import { messageOfTheDay } from './messages.js?v=0.10.0';
import { startAmbient } from './ambient.js?v=0.10.0';
import { qualityMix } from './calidad.js?v=0.10.0';
import * as CP from './copia.js?v=0.10.0';
import * as AG from './agua.js?v=0.10.0';
import { ACTIVITIES, ACT_BY_ID, burned, exerciseEntry, weeksMinutes, weekMinutes, WHO_WEEKLY_MIN } from './ejercicio.js?v=0.10.0';

const VERSION = '0.10.0';

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
    scheduleBackup();
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

const SCREENS = ['hoy', 'comidas', 'evolucion', 'registro', 'perfil'];
let comidas = null;   // se crea al arrancar, cuando ya existen persist/toast/render

function go(name, { focus, push = true } = {}) {
  if (!SCREENS.includes(name)) name = 'hoy';
  if (name === 'comidas' && current !== 'comidas') comidas?.resetDay();
  current = name;
  $$('.screen').forEach(sec => { sec.hidden = sec.id !== `screen-${name}`; });
  $$('.tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.go === name ? 'page' : 'false'));
  if (name === 'hoy') setGreeting(); else setTitle($(`#screen-${name}`).dataset.title);
  if (push && location.hash !== `#${name}`) history.pushState(null, '', `#${name}`);
  render();
  if (focus) document.getElementById(focus)?.scrollIntoView({ block: 'start' });
  else window.scrollTo(0, 0);
}

function setTitle(text, grad) {
  const h = $('#screen-title');
  h.replaceChildren(text);
  if (grad) {
    const sp = document.createElement('span');
    sp.className = 'grad';
    sp.textContent = grad;
    h.appendChild(sp);
  }
}

function setGreeting() {
  const h = new Date().getHours();
  const name = state.profile?.name?.split(' ')[0];
  const hi = h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
  if (name) setTitle(`${hi}, `, name); else setTitle(hi);
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
  if (state.profile) checkBadges(s);
  $('#today-label').textContent = C.parseDate(s.today).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  if (!state.profile) return;          // la bienvenida (o el aviso de datos) está delante
  if (current === 'hoy') renderHoy(s);
  if (current === 'evolucion') renderEvo(s);
  if (current === 'registro') renderLog(s);
  if (current === 'comidas') comidas?.renderComidas(s);
  if (current === 'perfil') renderPerfil(s);
}

function renderHoy(s) {
  const p = state.profile;
  setGreeting();

  // pesarse
  const input = $('#weigh-kg');
  input.placeholder = s.latest ? kg1(s.latest.kg) : '0,0';
  $('#weigh-hint').textContent = !s.latest
    ? 'Por la mañana, después del baño y antes de desayunar.'
    : s.weighedToday
      ? `Hoy ya apuntaste ${kg1(s.latest.kg)} kg. Si vuelves a guardar, se sustituye.`
      : `La última vez: ${kg1(s.latest.kg)} kg, el ${longDate(s.latest.date)}.`;

  renderWater(s);
  renderExercise(s);

  // mensaje (el lunes, con el resumen de tu semana)
  s.week = weekSummary(state, s.daily, s.today, p.sex);
  s.qualityYesterday = qualityMix(state.food?.[C.addDays(s.today, -1)] || [], state);
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
  $('#journey-sub').textContent = s.hasData ? journeySentence(s) : '';
  weightChart($('#chart-hoy'), {
    daily: s.daily, goalKg: p.goalKg, healthy: s.healthy, rangeDays: 30, perWeek: s.rate?.perWeek, compact: true,
    plan: s.plan, rateKgWeek: s.rateKgWeek, milestones: s.milestones,
    journey: true, goalDate: s.goalDate, today: s.today,
  });

  // fichas
  const tiles = $('#tiles');
  tiles.replaceChildren();
  const tile = (label, value, sub, extra) => {
    const d = document.createElement('div');
    d.className = 'tile';
    const l = document.createElement('p'); l.className = 'eyebrow'; l.textContent = label;
    const v = document.createElement('p'); v.className = 'tile-value'; v.textContent = value;
    d.append(l, v);
    if (extra) d.appendChild(extra);
    if (sub) { const x = document.createElement('p'); x.className = 'tile-sub'; x.textContent = sub; d.appendChild(x); }
    tiles.appendChild(d);
  };

  $('#tiles-label').hidden = !s.hasData;
  if (s.hasData) {
    if (s.pace) {
      const pz = paceZone(s.pace);
      tile('Tu plan', pz.value, `hoy tocaría ${kg1(s.planKgToday)} kg`, tag(pz));
    }
    if (s.nextMilestone) {
      const nm = s.nextMilestone;
      tile('Próximo objetivo', `${kg1(nm.kg)} kg`, `${nm.name ? nm.name + ' · ' : ''}${shortDate(nm.date)}`, tag(milestoneZone(nm)));
    }
    tile('Comido hoy', `${kcal(s.kcalToday)} kcal`,
      s.kcalToday ? (s.target.kcal >= s.kcalToday ? `te quedan ${kcal(s.target.kcal - s.kcalToday)}` : `${kcal(s.kcalToday - s.target.kcal)} por encima`) : 'apúntalo en Comidas');
    tile('Ritmo real', s.rate ? `${signed1(s.rate.perWeek)} kg/sem` : '—',
      s.rate ? 'medido en las últimas 3 semanas' : 'hacen falta 4 pesadas en una semana');
    tile('Meta', `${kg1(p.goalKg)} kg`, goalSentence(s, true));
    tile('IMC', kg1(s.bmi), null, tag(s.bmiZone));
    tile(s.maintain ? 'Para mantener' : 'Tu objetivo diario', `${kcal(s.target.kcal)} kcal`,
      s.maintain ? 'lo que gastas al día' : s.target.clipped ? 'el mínimo recomendable' : `para bajar ${paceText(s.rateKgWeek)} por semana`);
    tile('Gasto diario', `${kcal(s.tdee)} kcal`, 'estimado con tu actividad');
    tile('Racha', `${s.streak} ${s.streak === 1 ? 'día' : 'días'}`, 'pesándote seguidos');
  }

  const h = state.habits || {};
  $('#habits-nudge').hidden = !!(h.exerciseDays || h.work || h.steps || h.exerciseType);
}

function longDay(iso, withYear) {
  return C.parseDate(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' } : {}) });
}

// 0.5 → «0,5 kg»; 0.62 → «0,62 kg»
function paceText(rate) {
  const r = Math.round(rate * 100) / 100;
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(r)} kg`;
}

// Debajo del peso de hoy: dónde deberías estar, y adónde vas.
function journeySentence(s) {
  const p = state.profile;
  if (s.maintain) return 'Estás en tu meta: ahora toca mantener.';
  const far = s.goalDate && C.daysBetween(s.today, s.goalDate) > 300;
  const goal = s.goalDate ? `Meta: ${kg1(p.goalKg)} kg el ${longDay(s.goalDate, far)}.` : '';
  if (s.planKgToday == null) return goal;
  const where = `Hoy tocaría ${kg1(s.planKgToday)} kg`;
  if (!s.pace || s.entries.length < 2) return `${where}. ${goal}`;
  if (s.pace.status === 'ahead') return `${where}: vas ${kg1(-s.pace.diff)} kg por delante. ${goal}`;
  if (s.pace.status === 'behind') return `${where}: vas ${kg1(s.pace.diff)} kg por detrás. ${goal}`;
  return `${where}: vas en tu línea. ${goal}`;
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

/* ── tu plan y tus objetivos ─────────────────────────────────────────── */

function paceZone(pace) {
  if (pace.status === 'ahead') return { status: 'good', value: 'Por delante', label: `${kg1(-pace.diff)} kg mejor` };
  if (pace.status === 'behind') return { status: 'warning', value: 'Por detrás', label: `${kg1(pace.diff)} kg de más` };
  return { status: 'good', value: 'En tu carril', label: 'a buen ritmo' };
}

function paceSentence(s) {
  if (!s.pace) return '';
  if (s.pace.status === 'ahead') return `Vas ${kg1(-s.pace.diff)} kg por delante de tu plan.`;
  if (s.pace.status === 'behind') return `Vas ${kg1(s.pace.diff)} kg por encima de tu plan.`;
  return 'Vas dentro del carril de tu plan.';
}

function milestoneZone(m) {
  switch (m.status) {
    case 'conseguido': return { status: 'good', label: 'Conseguido' };
    case 'en-camino': return { status: 'good', label: 'Vas bien' };
    case 'detras': return { status: 'warning', label: 'Vas justo' };
    case 'pasado': return { status: 'warning', label: `A ${kg1(m.short)} kg` };
    default: return { status: 'neutral', label: 'Falta ritmo' };
  }
}

function milestoneDetail(m) {
  const far = C.daysBetween(C.todayISO(), m.date) > 300;
  const when = C.parseDate(m.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', ...(far ? { year: 'numeric' } : {}) });
  const base = `${kg1(m.kg)} kg · ${when}`;
  switch (m.status) {
    case 'conseguido': return `${base} · lo lograste el ${shortDate(m.reachedOn)}`;
    case 'en-camino': return `${base} · a tu ritmo llegas a ${kg1(m.projected)} kg`;
    case 'detras': return `${base} · hacen falta ${kg1(m.needed)} kg/sem`;
    case 'pasado': return `${base} · la fecha ya pasó`;
    default: return `${base} · con unas semanas de pesadas te digo si llegas`;
  }
}

function renderGoals(s) {
  const list = $('#goals');
  list.replaceChildren();
  (s.milestones || []).forEach(m => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'log-row';
    b.dataset.goal = m.id;
    const main = document.createElement('span'); main.className = 'log-main';
    const t = document.createElement('span'); t.className = 'log-date'; t.textContent = m.name || `${kg1(m.kg)} kg`;
    const sub = document.createElement('span'); sub.className = 'log-sub'; sub.textContent = milestoneDetail(m);
    main.append(t, sub);
    const side = document.createElement('span'); side.className = 'log-side';
    side.appendChild(tag(milestoneZone(m)));
    const chev = document.createElement('span'); chev.className = 'chev'; chev.setAttribute('aria-hidden', 'true');
    b.append(main, side, chev);
    li.appendChild(b);
    list.appendChild(li);
  });
  const li = document.createElement('li');
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'log-row add';
  add.dataset.goal = '';
  const main = document.createElement('span'); main.className = 'log-main';
  const t = document.createElement('span'); t.className = 'log-date'; t.textContent = 'Añadir objetivo';
  main.appendChild(t);
  add.appendChild(main);
  li.appendChild(add);
  list.appendChild(li);
}

function renderEvo(s) {
  const p = state.profile;
  $$('.segmented button[data-range]').forEach(b => b.setAttribute('aria-checked', String(Number(b.dataset.range) === ui.range)));
  $('#evo-sub').textContent = s.hasData ? [paceSentence(s), goalSentence(s)].filter(Boolean).join(' ') : '';
  weightChart($('#chart-evo'), {
    daily: s.daily, goalKg: p.goalKg, healthy: s.healthy, rangeDays: ui.range > 0 ? ui.range : null, perWeek: s.rate?.perWeek,
    plan: s.plan, rateKgWeek: s.rateKgWeek, milestones: s.milestones,
    journey: ui.range === -1, goalDate: s.goalDate, today: s.today,
  });
  renderGoals(s);
  renderWaist(s);
  rateChart($('#chart-rate'), s.weekly);
  renderWeek(s);
  renderBadges(s);
  kcalChart($('#chart-kcal'), { food: state.food, target: s.target?.kcal, today: s.today });
  renderExerciseChart(s);
  renderQualityChart(s);
  renderCravingCard($('#craving-card'), state.cravings, s.today, state.food, s.protein ? (s.protein[0] + s.protein[1]) / 2 : null);

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
    fact('Gasto diario (fórmula)', `${kcal(s.tdeeFormula)} kcal`, `El basal por tu actividad «${C.ACTIVITY[p.activity]?.label ?? '—'}».`);
    measuredFact(s);
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

// El gasto medido: aparece cuando hay 14 días apuntados, con el botón para usarlo.
function measuredFact(s) {
  const facts = $('#facts');
  const wrap = document.createElement('div');
  const dt = document.createElement('dt'); dt.textContent = 'Tu gasto real, medido';
  const dd = document.createElement('dd');
  const v = document.createElement('span'); v.className = 'fact-value';
  const note = document.createElement('small');
  if (!s.measured) {
    v.textContent = '—';
    note.textContent = 'Apunta lo que comes y pésate: con 14 días de comidas en las últimas 4 semanas, mido lo que gastas de verdad. Corrige la fórmula y los errores de la tabla.';
    dd.append(v, note);
  } else {
    v.textContent = `${kcal(s.measured.tdee)} kcal`;
    const using = !!state.profile.useMeasured;
    note.textContent = `Comiste de media ${kcal(s.measured.avgIntake)} kcal (${s.measured.logged} días apuntados) y tu tendencia ${s.measured.change < 0 ? 'bajó' : 'subió'} ${kg1(Math.abs(s.measured.change))} kg en ${s.measured.days} días. ${using ? 'Tu objetivo diario ya sale de este gasto.' : 'Tu objetivo diario sale de la fórmula.'}`;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ghost small';
    b.textContent = using ? 'Volver a la fórmula' : 'Usar este gasto';
    b.addEventListener('click', () => {
      state.profile.useMeasured = !using;
      if (persist(using ? 'Tu objetivo vuelve a salir de la fórmula.' : 'Tu objetivo sale ahora de tu gasto medido.')) render();
    });
    dd.append(v, note, b);
  }
  wrap.append(dt, dd);
  facts.appendChild(wrap);
}

/* ── agua ───────────────────────────────────────────────────────────── */

const GLASS_SVG = '<svg viewBox="0 0 36 44" aria-hidden="true"><path class="g-in" d="M9.2 16h17.6l-2 22.2a2.4 2.4 0 0 1-2.4 2.2h-8.8a2.4 2.4 0 0 1-2.4-2.2z"/><path class="g-out" d="M6 4h24l-3 34.4a3 3 0 0 1-3 2.6H12a3 3 0 0 1-3-2.6z"/></svg>';

function renderWater(s) {
  const goal = waterGoal(state.profile.sex);
  const n = state.water?.[s.today] || 0;
  $('#water-count').textContent = n >= goal ? `${n} vasos · ¡hecho!` : `${n} de ${goal} vasos`;
  const box = $('#glasses');
  box.replaceChildren();
  const total = Math.min(14, Math.max(goal, n + 1));
  for (let i = 0; i < total; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `glass${i < n ? ' full' : ''}`;
    b.setAttribute('aria-label', i < n ? `Quitar vaso ${i + 1}` : `Vaso ${i + 1}`);
    b.innerHTML = GLASS_SVG;
    b.addEventListener('click', () => {
      const next = i < n ? i : i + 1;    // tocar el último lleno lo vacía
      state.water = { ...(state.water || {}), [s.today]: next };
      if (next === 0) delete state.water[s.today];
      if (next > n) state.meta = { ...state.meta, lastGlass: Date.now() };
      if (persist(next === goal ? '¡Agua del día completada!' : null)) {
        render();
        syncWater();
        if (waterCfg().on) AG.reportGlass(s.today, next);
      }
    });
    box.appendChild(b);
  }
}

/* ── ejercicio ──────────────────────────────────────────────────────── */

const minFmt = m => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);

function renderExercise(s) {
  const ex = s.exerciseToday || { minutes: 0, kcal: 0, list: [] };
  $('#exercise-count').textContent = ex.minutes ? `${minFmt(ex.minutes)} · ${kcal(ex.kcal)} kcal` : 'Nada todavía';
  const ul = $('#exercise-list');
  ul.replaceChildren();
  ex.list.forEach(e => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ex-chip';
    b.setAttribute('aria-label', `Quitar ${ACT_BY_ID.get(e.act)?.label || e.act}, ${e.minutes} minutos`);
    b.textContent = `${ACT_BY_ID.get(e.act)?.label || e.act} · ${minFmt(e.minutes)} · ${kcal(e.kcal)} kcal`;
    const x = document.createElement('span'); x.className = 'ex-x'; x.setAttribute('aria-hidden', 'true'); x.textContent = '×';
    b.appendChild(x);
    b.addEventListener('click', () => {
      if (!confirm(`¿Quitar ${b.textContent.replace(/×$/, '').trim()}?`)) return;
      state.exercise[s.today] = (state.exercise[s.today] || []).filter(y => y.id !== e.id);
      if (!state.exercise[s.today].length) delete state.exercise[s.today];
      if (persist('Quitado.')) render();
    });
    li.appendChild(b);
    ul.appendChild(li);
  });
  const week = weekMinutes(state.exercise, s.today, C.addDays);
  $('#exercise-bar').style.width = `${Math.min(100, week / WHO_WEEKLY_MIN * 100)}%`;
  $('#exercise-bar').className = week >= WHO_WEEKLY_MIN ? 'done' : '';
  const credit = s.exerciseCredit > 0 ? ` Hoy suma ${kcal(s.exerciseCredit)} kcal a lo que puedes comer.` : '';
  $('#exercise-week').textContent = week >= WHO_WEEKLY_MIN
    ? `Últimos 7 días: ${minFmt(week)}. Ya pasas de los 150 minutos que recomienda la OMS.${credit}`
    : `Últimos 7 días: ${minFmt(week)} de los 150 que recomienda la OMS.${credit}`;
}

const edlg = $('#exercise-dialog');
let exChoice = { act: 'andar-rapido', minutes: 30 };
const EX_PRESETS = [15, 30, 45, 60, 90];

function exWeight() {
  const s = C.summarize(state, today());
  return s.trendKg || s.latest?.kg || 75;
}

function updateExerciseSheet() {
  const a = ACT_BY_ID.get(exChoice.act);
  $$('#ex-types .crv-type').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.act === exChoice.act)));
  $$('#ex-minutes button').forEach(b => b.setAttribute('aria-checked', String(Number(b.dataset.m) === exChoice.minutes)));
  $('#ex-qty').value = String(exChoice.minutes);
  const kg = exWeight();
  $('#ex-kcal').textContent = `≈ ${kcal(burned(a.met, kg, exChoice.minutes))} kcal`;
  $('#ex-note').textContent = `${a.label}, ${minFmt(exChoice.minutes)}, con tu peso (${kg1(kg)} kg). Es una estimación: sirve para comparar, no para cuadrar al gramo.`;
}

function openExercise() {
  const grid = $('#ex-types');
  if (!grid.children.length) {
    ACTIVITIES.forEach(a => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'crv-type';
      b.dataset.act = a.id;
      const l = document.createElement('span'); l.className = 'crv-type-label'; l.textContent = a.label;
      b.appendChild(l);
      b.addEventListener('click', () => { exChoice.act = a.id; updateExerciseSheet(); });
      grid.appendChild(b);
    });
    const seg = $('#ex-minutes');
    EX_PRESETS.forEach(m => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.dataset.m = String(m);
      b.textContent = m >= 60 ? minFmt(m).replace(' 0 min', '') : `${m}′`;
      b.addEventListener('click', () => { exChoice.minutes = m; updateExerciseSheet(); });
      seg.appendChild(b);
    });
  }
  exChoice = { act: state.meta?.lastExercise || 'andar-rapido', minutes: 30 };
  updateExerciseSheet();
  edlg.showModal();
}

$('#exercise-add').addEventListener('click', openExercise);
$('#ex-cancel').addEventListener('click', () => edlg.close());
edlg.addEventListener('click', e => { if (e.target === edlg) edlg.close(); });
$('#ex-minus').addEventListener('click', () => { exChoice.minutes = Math.max(5, exChoice.minutes - 5); updateExerciseSheet(); });
$('#ex-plus').addEventListener('click', () => { exChoice.minutes = Math.min(600, exChoice.minutes + 5); updateExerciseSheet(); });
$('#ex-qty').addEventListener('change', e => {
  const v = Math.round(num(e.target.value));
  if (v > 0 && v <= 600) exChoice.minutes = v;
  updateExerciseSheet();
});
$('#ex-save').addEventListener('click', () => {
  const v = Math.round(num($('#ex-qty').value));
  if (v > 0 && v <= 600) exChoice.minutes = v;
  const entry = exerciseEntry(exChoice.act, exChoice.minutes, exWeight());
  if (!entry) { toast('Elige qué has hecho y cuántos minutos.', true); return; }
  const d = today();
  state.exercise = { ...(state.exercise || {}), [d]: [...(state.exercise?.[d] || []), entry] };
  state.meta = { ...state.meta, lastExercise: entry.act };
  if (persist(`${ACT_BY_ID.get(entry.act).label}, ${minFmt(entry.minutes)}: unas ${kcal(entry.kcal)} kcal.`)) { edlg.close(); render(); }
});

// Evolución: los minutos de cada semana frente a los 150 de la OMS
function renderExerciseChart(s) {
  const box = $('#chart-exercise');
  box.replaceChildren();
  const weeks = weeksMinutes(state.exercise, s.today, C.addDays, 8);
  const any = weeks.some(w => w.minutes > 0);
  const cur = weeks[weeks.length - 1], prev = weeks[weeks.length - 2];
  $('#exercise-chart-sub').textContent = !any
    ? 'Cuando apuntes ejercicio en Hoy, aquí verás tus minutos de cada semana frente a los 150 que recomienda la OMS.'
    : `Esta semana llevas ${minFmt(cur.minutes)}; la anterior, ${minFmt(prev.minutes)}. La raya marca los 150 minutos de la OMS: más que quemar calorías, el ejercicio te ayuda a no perder músculo mientras adelgazas.`;
  if (!any) return;
  const max = Math.max(WHO_WEEKLY_MIN * 1.2, ...weeks.map(w => w.minutes));
  const line = document.createElement('div');
  line.className = 'ex-who';
  line.style.bottom = `calc(18px + (100% - 18px) * ${WHO_WEEKLY_MIN / max})`;
  box.appendChild(line);
  weeks.forEach(w => {
    const col = document.createElement('div');
    col.className = 'qcol';
    const bar = document.createElement('div');
    bar.className = `exbar${w.minutes >= WHO_WEEKLY_MIN ? ' done' : ''}${w.current ? ' cur' : ''}`;
    bar.style.height = `calc((100% - 18px) * ${w.minutes / max})`;
    bar.title = `Semana del ${longDate(w.start)}: ${minFmt(w.minutes)}`;
    const l = document.createElement('span');
    l.className = 'qday-l';
    l.textContent = w.current ? 'esta' : new Date(w.start + 'T12:00').getDate();
    col.append(bar, l);
    box.appendChild(col);
  });
}

/* ── recordatorios de agua ──────────────────────────────────────────── */

function waterCfg() {
  return { ...AG.DEFAULTS, ...(state.meta?.agua || {}) };
}

// El puente con el service worker: le cuenta lo de hoy y recoge los vasos
// apuntados desde la notificación (y si se silenció desde ella).
async function syncWater() {
  if (!state.profile) return;
  const day = today();
  const count = state.water?.[day] || 0;
  const cfg = waterCfg();
  const r = await AG.syncBridge({ day, count, goal: waterGoal(state.profile.sex), cfg, lastGlass: state.meta?.lastGlass });
  let changed = false;
  if (r.added > 0) {
    state.water = { ...(state.water || {}), [day]: r.count };
    state.meta = { ...state.meta, lastGlass: Math.max(state.meta?.lastGlass || 0, r.lastGlass || 0) };
    changed = true;
  }
  if (r.silenced && cfg.on) {
    state.meta = { ...state.meta, agua: { ...cfg, on: false } };
    changed = true;
    toast('Recordatorios de agua silenciados desde la notificación.');
  }
  if (changed && persist()) render();
}

function renderWaterSettings() {
  const cfg = waterCfg();
  const f = $('#water-form');
  setPickerValue(f, 'wevery', String(cfg.every));
  setPickerValue(f, 'wfrom', String(cfg.from));
  setPickerValue(f, 'wto', String(cfg.to));
  $('#water-toggle-val').textContent = cfg.on ? 'Sí' : 'No';
  const note = $('#water-note');
  if (!AG.supported()) note.textContent = 'Este navegador no deja mandar notificaciones.';
  else if (typeof Notification !== 'undefined' && Notification.permission === 'denied') note.textContent = 'Las notificaciones de Trampantojo están bloqueadas: actívalas en Ajustes de Android › Aplicaciones › Trampantojo › Notificaciones.';
  else if (!cfg.on) note.textContent = `Si pasan ${pickerLabel('wevery', String(cfg.every))} sin un vaso, entre las ${cfg.from}:00 y las ${cfg.to}:00, te aviso. Desde la notificación puedes apuntar el vaso o silenciarlo para siempre.`;
  else note.textContent = AG.PUSH_URL
    ? `Activado: te aviso si pasan ${pickerLabel('wevery', String(cfg.every))} sin beber, de ${cfg.from}:00 a ${cfg.to}:00.`
    : 'Activado. Ojo: con la app cerrada, Android sólo deja que una web te avise cuando él quiere (alguna vez al día). Para que el aviso llegue a su hora hace falta el servidor de avisos, que está en camino.';
}

$('#water-toggle').addEventListener('click', async () => {
  const cfg = waterCfg();
  if (cfg.on) {
    state.meta = { ...state.meta, agua: { ...cfg, on: false } };
    if (persist('Recordatorios de agua desactivados.')) { render(); syncWater(); }
    AG.disable();
    return;
  }
  const s = C.summarize(state, today());
  const r = await AG.enable({ ...cfg, on: true }, s.today, state.water?.[s.today] || 0, waterGoal(state.profile.sex));
  if (!r.ok) {
    toast(r.perm === 'denied' ? 'Has bloqueado las notificaciones. Actívalas en Ajustes de Android › Aplicaciones › Trampantojo.' : 'Este móvil no deja mandar notificaciones desde la app.', true);
    renderWaterSettings();
    return;
  }
  state.meta = { ...state.meta, agua: { ...cfg, on: true } };
  if (persist('Recordatorios de agua activados.')) { render(); syncWater(); }
});

$('#water-form').addEventListener('input', () => {
  const f = $('#water-form');
  const cfg = { ...waterCfg(), every: Number(f.elements.wevery.value) || 2, from: Number(f.elements.wfrom.value) || 10, to: Number(f.elements.wto.value) || 21 };
  if (cfg.to <= cfg.from) cfg.to = Math.min(23, cfg.from + 8);
  state.meta = { ...state.meta, agua: cfg };
  if (persist()) { renderWaterSettings(); syncWater(); if (cfg.on) AG.reportSettings(cfg, waterGoal(state.profile.sex)); }
});

$('#water-test').addEventListener('click', async () => {
  const perm = await AG.askPermission();
  if (perm !== 'granted') { toast(perm === 'denied' ? 'Las notificaciones están bloqueadas para Trampantojo.' : 'Este móvil no deja mandar notificaciones.', true); renderWaterSettings(); return; }
  await syncWater();
  await AG.testNotification(state.water?.[today()] || 0, waterGoal(state.profile.sex));
  toast('Mira tus notificaciones: prueba «+1 vaso» y, si quieres, «Silenciar para siempre».');
});

// Lo que cuenta el service worker cuando se toca un botón de la notificación.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type === 'agua' || e.data?.type === 'agua-silenciado') syncWater();
  });
}

/* ── logros ─────────────────────────────────────────────────────────── */

function checkBadges(s) {
  const first = !state.meta?.badges;          // la primera vez se guardan sin felicitar
  const { fresh, stored } = evaluateBadges(state, s, s.today);
  if (!fresh.length) return;
  state.meta = { ...(state.meta || {}), badges: stored };
  persist(first ? null : fresh.length === 1 ? `Logro nuevo: ${fresh[0].title}. ${fresh[0].desc}` : `${fresh.length} logros nuevos: ${fresh.map(b => b.title).join(', ')}`);
}

/* ── la cintura ─────────────────────────────────────────────────────── */

function renderWaist(s) {
  const pts = (s.entries || []).filter(e => e.waist > 0).map(e => ({ date: e.date, v: e.waist }));
  const ref = Math.round(state.profile.heightCm / 2);
  measureChart($('#chart-waist'), { points: pts, ref, refLabel: `${ref} cm · la mitad de tu altura` });
  const sub = $('#waist-sub');
  if (pts.length < 2) { sub.textContent = `Tu señal buena: menos de ${ref} cm, la mitad de tu altura.`; return; }
  const first = pts[0], last = pts[pts.length - 1];
  const d = last.v - first.v;
  const dec = v => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(v);
  sub.textContent = `${dec(first.v)} → ${dec(last.v)} cm desde el ${shortDate(first.date)} (${d <= 0 ? '−' : '+'}${dec(Math.abs(d))} cm). `
    + (last.v < ref ? 'Ya estás por debajo de la mitad de tu altura: la señal buena.' : `Tu señal buena: menos de ${ref} cm, te faltan ${dec(last.v - ref)}.`);
}

/* ── la calidad de tus calorías, día a día ──────────────────────────── */

const DAY_LETTER = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

function renderQualityChart(s) {
  const box = $('#chart-quality');
  box.replaceChildren();
  const days = Array.from({ length: 14 }, (_, i) => C.addDays(s.today, i - 13));
  const mixes = days.map(d => ({ d, m: qualityMix(state.food?.[d] || [], state) }));
  const max = Math.max(1, ...mixes.map(x => x.m.known));
  const week = mixes.slice(-7).reduce((a, x) => ({ b: a.b + x.m.kcal.b, r: a.r + x.m.kcal.r, m: a.m + x.m.kcal.m }), { b: 0, r: 0, m: 0 });
  const wk = week.b + week.r + week.m;
  $('#quality-chart-sub').textContent = wk < 300
    ? 'Cuando apuntes comidas, aquí verás cada día cuántas de tus calorías son buenas, regulares o de las que conviene evitar.'
    : `Últimos 7 días: ${Math.round(week.b / wk * 100)} % buenas, ${Math.round(week.r / wk * 100)} % regulares y ${Math.round(week.m / wk * 100)} % a evitar. El objetivo no es comer menos, sino que el verde mande.`;
  if (wk < 300 && !mixes.some(x => x.m.known)) return;
  mixes.forEach(({ d, m }) => {
    const col = document.createElement('div');
    col.className = 'qcol';
    const stack = document.createElement('div');
    stack.className = 'qstack';
    stack.style.height = `calc((100% - 18px) * ${m.known / max})`;
    stack.title = m.known ? `${longDate(d)}: ${Math.round(m.pct.b * 100)} % buenas, ${Math.round(m.pct.m * 100)} % a evitar` : longDate(d);
    ['m', 'r', 'b'].forEach(c => {
      if (!m.kcal[c]) return;
      const seg = document.createElement('span');
      seg.className = `q-${c}`;
      seg.style.flexGrow = String(m.kcal[c]);
      stack.appendChild(seg);
    });
    const l = document.createElement('span');
    l.className = 'qday-l';
    l.textContent = DAY_LETTER[new Date(d + 'T12:00').getDay()];
    col.append(stack, l);
    box.appendChild(col);
  });
}

function renderBadges(s) {
  const { earned, locked } = evaluateBadges(state, s, s.today);
  const box = $('#badges');
  box.replaceChildren();
  const card = (b, date, isLocked) => {
    const d = document.createElement('div');
    d.className = `badge${isLocked ? ' locked' : ''}`;
    d.title = b.desc;
    const t = document.createElement('span'); t.className = 'badge-token'; t.textContent = b.glyph;
    const h = document.createElement('span'); h.className = 'badge-title'; h.textContent = b.title;
    const sub = document.createElement('span'); sub.className = 'badge-sub'; sub.textContent = isLocked ? b.desc : longDate(date);
    d.append(t, h, sub);
    return d;
  };
  earned.forEach(({ badge, date }) => box.appendChild(card(badge, date, false)));
  locked.forEach(b => box.appendChild(card(b, null, true)));
}

/* ── tu semana ──────────────────────────────────────────────────────── */

function renderWeek(s) {
  const w = weekSummary(state, s.daily, s.today, state.profile.sex);
  const box = $('#week-card');
  box.replaceChildren();
  const t = document.createElement('p'); t.className = 'eyebrow'; t.textContent = 'Esta semana';
  const sub = document.createElement('p'); sub.className = 'card-sub'; sub.textContent = 'Los últimos 7 días, frente a los 7 anteriores.';
  const grid = document.createElement('div'); grid.className = 'week-grid';
  const item = (label, value, delta, good) => {
    const d = document.createElement('div'); d.className = 'week-item';
    const l = document.createElement('span'); l.className = 'l'; l.textContent = label;
    const v = document.createElement('span'); v.className = 'v'; v.textContent = value;
    d.append(l, v);
    if (delta) { const x = document.createElement('span'); x.className = `d${good ? ' good' : ''}`; x.textContent = delta; d.appendChild(x); }
    grid.appendChild(d);
  };
  item('Tendencia', w.change == null ? '—' : `${signed1(w.change)} kg`, null, false);
  const k = w.cur.avgKcal, kp = w.prev.avgKcal;
  item('Calorías de media', k == null ? '—' : `${kcal(k)}`, k != null && kp != null ? `${k <= kp ? '−' : '+'}${kcal(Math.abs(k - kp))} frente a la anterior` : `${w.cur.foodDays} de 7 días apuntados`, k != null && kp != null && k <= kp);
  item('Antojos vencidos', `${w.cur.beaten} de ${w.cur.cravings}`, w.prev.cravings ? `la anterior: ${w.prev.beaten} de ${w.prev.cravings}` : null, false);
  item('Agua al día', `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(w.cur.avgWater)} vasos`, `tu objetivo: ${w.waterGoal}`, w.cur.avgWater >= w.waterGoal);
  item('Ejercicio', minFmt(w.cur.exMinutes), w.prev.exMinutes ? `la anterior: ${minFmt(w.prev.exMinutes)}` : 'la OMS: 150 min', w.cur.exMinutes >= WHO_WEEKLY_MIN);
  const gp = w.cur.goodPct, gpp = w.prev.goodPct;
  item('Calorías buenas', gp == null ? '—' : `${Math.round(gp * 100)} %`, gp != null && gpp != null ? `la anterior: ${Math.round(gpp * 100)} %` : 'de lo que apuntas', gp != null && gp >= 0.7);
  item('Días pesándote', `${w.cur.weighIns} de 7`, null, false);
  box.append(t, sub, grid);
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
  updatePace($('#profile-form'));
  updateActivityHint();
  updateHabitsSuggest();
  reflectTheme();
  renderBackupUi();
  renderWaterSettings();
  const pl = s.plan;
  const endTxt = s.planEnd ? C.parseDate(s.planEnd).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  $('#plan-summary').textContent = !pl || !s.hasData ? ''
    : s.maintain ? 'Ya estás en tu meta: ahora el plan es mantener.'
      : `Empezó el ${longDate(pl.startDate)} con ${kg1(pl.startKg)} kg y llega a ${kg1(state.profile.goalKg)} kg el ${endTxt}: ${paceText(s.rateKgWeek)} por semana. Si cambias la meta o la fecha, el plan vuelve a empezar desde hoy.`;
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


function fillProfileForm(f) {
  const p = state.profile;
  if (!p) return;
  f.elements.name.value = p.name || '';
  f.querySelectorAll('input[name="sex"]').forEach(r => { r.checked = r.value === p.sex; });
  f.elements.birthDate.value = p.birthDate || '';
  f.elements.heightCm.value = p.heightCm ? int(p.heightCm) : '';
  f.elements.goalKg.value = p.goalKg ? kg1(p.goalKg) : '';
  f.elements.goalDate.value = C.summarize(state, today()).goalDate || '';
  setPickerValue(f, 'activity', p.activity || 'sedentario');
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
    const goalDate = f.elements.goalDate.value;
    const from = paceOrigin(f);
    if (from.kg > goalKg) {
      if (!goalDate) return { error: '¿Para cuándo quieres llegar? Elige una fecha (o un ritmo).' };
      if (goalDate <= today()) return { error: 'La fecha de la meta tiene que ser más adelante.' };
      const rate = C.rateForDate(from.date, from.kg, goalKg, goalDate);
      if (rate > C.MAX_RATE + 0.005) {
        const sane = C.dateForRate(from.date, from.kg, goalKg, C.MAX_RATE);
        return { error: `Esa fecha pide ${paceText(rate)} por semana: demasiado rápido. Lo más rápido sano sería el ${longDay(sane, true)}.` };
      }
      data.rateKgWeek = Math.round(rate * 1000) / 1000;
    } else {
      data.rateKgWeek = 0;
    }
    data.goalDate = goalDate || null;
    data.activity = f.elements.activity.value || 'sedentario';
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

/* ── el ritmo: sale de la fecha, o se elige y pone la fecha ─────────── */

// Desde dónde se mide el ritmo en este formulario: en la bienvenida, el peso
// que acabas de escribir; en el perfil, tu plan (o hoy, si cambias la meta).
function paceOrigin(f) {
  if (f.id === 'welcome-form') return { date: today(), kg: num(f.elements.kg.value) };
  const s = C.summarize(state, today());
  const p = state.profile;
  const same = p && num(f.elements.goalKg.value) === p.goalKg && f.elements.goalDate.value === s.goalDate;
  if (same && s.plan) return { date: s.plan.startDate, kg: s.plan.startKg };
  return { date: today(), kg: s.trendKg ?? s.latest?.kg ?? NaN };
}

const PACES = [
  { value: '0.25', label: 'Suave', hint: '0,25 kg por semana · casi no se nota' },
  { value: '0.5', label: 'Normal', hint: '0,5 kg por semana · lo recomendado' },
  { value: '0.75', label: 'Rápido', hint: '0,75 kg por semana · pide constancia' },
  { value: '1', label: 'Máximo', hint: '1 kg por semana · el tope sano' },
];

function formRate(f) {
  const from = paceOrigin(f);
  const goal = num(f.elements.goalKg.value);
  if (Number.isNaN(from.kg) || Number.isNaN(goal)) return null;
  return C.rateForDate(from.date, from.kg, goal, f.elements.goalDate.value);
}

// Pone la etiqueta del ritmo y la explicación debajo.
function updatePace(f) {
  const hint = f.id === 'welcome-form' ? $('#welcome-pace-hint') : $('#pace-hint');
  const label = f.querySelector('[data-for="pace"]');
  const rate = formRate(f);
  hint.classList.remove('warn');
  if (rate == null) {
    label.textContent = '—';
    hint.textContent = f.elements.goalDate.value ? '' : 'Elige para cuándo, o un ritmo, y te pongo la fecha.';
    return;
  }
  const preset = PACES.find(x => Math.abs(Number(x.value) - rate) < 0.02);
  const shown = preset ? Number(preset.value) : rate;      // 0,745 por redondear días es «0,75»
  label.textContent = `${paceText(shown)}/sem${preset ? ' · ' + preset.label.toLowerCase() : ''}`;
  if (rate > C.MAX_RATE + 0.005) {
    const from = paceOrigin(f);
    const sane = C.dateForRate(from.date, from.kg, num(f.elements.goalKg.value), C.MAX_RATE);
    hint.textContent = `Son ${paceText(rate)} por semana: demasiado rápido. Lo más rápido sano sería el ${longDay(sane, true)}.`;
    hint.classList.add('warn');
  } else if (rate < 0.1) {
    hint.textContent = `Son ${paceText(rate)} por semana: muy despacio. Puedes adelantar la fecha si quieres.`;
  } else {
    hint.textContent = `Son ${paceText(shown)} por semana: un ritmo sano. La línea a seguir sale en tu gráfica.`;
  }
}

// Elegir un ritmo pone la fecha de la meta.
function applyPace(f, rate) {
  const from = paceOrigin(f);
  const goal = num(f.elements.goalKg.value);
  if (Number.isNaN(from.kg) || Number.isNaN(goal)) { toast('Escribe antes tu peso y tu peso objetivo.', true); return; }
  if (from.kg <= goal) { toast('Tu objetivo es mantener: no hace falta ritmo.', true); return; }
  f.elements.goalDate.value = C.dateForRate(from.date, from.kg, goal, rate);
  f.dataset.dateTouched = '1';
  updatePace(f);
}

/* ── selectores (sustituyen a los desplegables del navegador) ───────── */

const PICKERS = {
  activity: { title: 'Actividad', options: () => Object.entries(C.ACTIVITY).map(([value, a]) => ({ value, label: a.label, hint: a.hint })) },
  pace: { title: 'Ritmo', foot: 'Elegir un ritmo pone la fecha de la meta. También puedes poner la fecha y el ritmo sale solo.', options: () => PACES },
  work: { title: 'Tu trabajo', options: () => [
    { value: '', label: 'Sin decir' },
    { value: 'sentado', label: 'Sentado', hint: 'casi todo el día' },
    { value: 'pie', label: 'De pie', hint: 'buena parte del día' },
    { value: 'movimiento', label: 'Físico', hint: 'en movimiento, cargando peso…' },
  ] },
  steps: { title: 'Pasos al día', options: () => [
    { value: '', label: 'No lo sé' },
    { value: 'menos5', label: 'Menos de 5.000' },
    { value: '5a8', label: 'Entre 5.000 y 8.000' },
    { value: '8a12', label: 'Entre 8.000 y 12.000' },
    { value: 'mas12', label: 'Más de 12.000' },
  ] },
  oil: { title: 'Aceite al cocinar', options: () => [
    { value: '', label: 'Sin decir' }, { value: 'poco', label: 'Poco' }, { value: 'normal', label: 'Normal' }, { value: 'mucho', label: 'Bastante' },
  ] },
  exerciseCredit: { title: 'Calorías del ejercicio', foot: 'Lo que se estima que quema el ejercicio es orientativo y suele pasarse, y tu nivel de actividad ya cuenta el ejercicio de siempre. Por eso, por defecto, no se suma a lo que puedes comer.', options: () => [
    { value: '', label: 'No sumarlas', hint: 'recomendado' },
    { value: 'mitad', label: 'Sumar la mitad', hint: 'un término medio prudente' },
    { value: 'todo', label: 'Sumarlas todas', hint: 'si el ejercicio es extra, no el de siempre' },
  ] },
  wevery: { title: 'Avisarme si no bebo en', options: () => [
    { value: '1', label: '1 hora' }, { value: '1.5', label: '1 h 30 min' }, { value: '2', label: '2 horas' }, { value: '3', label: '3 horas' },
  ] },
  wfrom: { title: 'Desde', foot: 'Antes de esta hora no te aviso.', options: () => [7, 8, 9, 10, 11, 12].map(h => ({ value: String(h), label: `${h}:00` })) },
  wto: { title: 'Hasta', foot: 'A partir de esta hora no te aviso.', options: () => [18, 19, 20, 21, 22, 23].map(h => ({ value: String(h), label: `${h}:00` })) },
  portions: { title: 'Tus raciones', options: () => [
    { value: '', label: 'Sin decir' }, { value: 'pequenas', label: 'Pequeñas' }, { value: 'normales', label: 'Normales' }, { value: 'grandes', label: 'Grandes' },
  ] },
};

function pickerLabel(name, value) {
  const o = PICKERS[name].options().find(x => x.value === (value ?? ''));
  return o ? o.label : '—';
}

function setPickerValue(root, name, value) {
  const input = root.querySelector(`input[type="hidden"][name="${name}"]`);
  if (input) input.value = value ?? '';
  const label = root.querySelector(`[data-for="${name}"]`);
  if (label) label.textContent = pickerLabel(name, value ?? '');
}

const pdlg = $('#picker-dialog');

function openPicker(name, root) {
  const def = PICKERS[name];
  const current = name === 'pace'
    ? (() => { const r = formRate(root); const p = r != null && PACES.find(x => Math.abs(Number(x.value) - r) < 0.02); return p ? p.value : null; })()
    : root.querySelector(`input[type="hidden"][name="${name}"]`)?.value ?? '';
  $('#picker-title').textContent = def.title;
  $('#picker-foot').textContent = def.foot || '';
  const list = $('#picker-list');
  list.replaceChildren();
  def.options().forEach(o => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'item';
    b.setAttribute('role', 'option');
    b.setAttribute('aria-selected', String(o.value === current));
    const t = document.createElement('span'); t.className = 'opt-text';
    const l = document.createElement('span'); l.className = 'opt-label'; l.textContent = o.label;
    t.appendChild(l);
    if (o.hint) { const h = document.createElement('span'); h.className = 'opt-hint'; h.textContent = o.hint; t.appendChild(h); }
    const check = document.createElement('span'); check.className = 'check'; check.setAttribute('aria-hidden', 'true');
    b.append(t, check);
    b.addEventListener('click', () => {
      if (name === 'pace') applyPace(root, Number(o.value));
      else {
        setPickerValue(root, name, o.value);
        root.dispatchEvent(new Event('input', { bubbles: true }));
      }
      pdlg.close();
    });
    li.appendChild(b);
    list.appendChild(li);
  });
  pdlg.showModal();
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-picker]');
  if (!b) return;
  openPicker(b.dataset.picker, b.closest('form') || document);
});
$('#picker-done').addEventListener('click', () => pdlg.close());
pdlg.addEventListener('click', e => { if (e.target === pdlg) pdlg.close(); });

/* ── apariencia: claro (como bimio.tools), oscuro o lo que diga el móvil ── */

function themeChoice() {
  try { return localStorage.getItem('trampantojo:tema') || 'light'; } catch { return 'light'; }
}

function isDarkNow() {
  const t = document.documentElement.dataset.theme;
  return t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
}

function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', isDarkNow() ? '#000000' : '#f5f5f7');
  reflectTheme();
}

function reflectTheme() {
  const t = themeChoice();
  $$('#theme-seg button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.themeChoice === t)));
}

function setThemeChoice(t) {
  try { localStorage.setItem('trampantojo:tema', t); } catch { /* sólo en esta sesión */ }
  applyTheme(t);
}


$$('#theme-seg button').forEach(b => b.addEventListener('click', () => setThemeChoice(b.dataset.themeChoice)));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(themeChoice()));

function updateActivityHint() {
  const f = $('#profile-form');
  const a = C.ACTIVITY[f.elements.activity.value];
  $('#activity-hint').textContent = a ? `Actividad ${a.label.toLowerCase()}: ${a.hint.toLowerCase()}. Tu gasto es tu basal × ${String(a.factor).replace('.', ',')}.` : '';
}

$('#profile-form').addEventListener('input', e => {
  const f = $('#profile-form');
  if (['heightCm', 'goalKg'].includes(e.target.name)) updateGoalHint(f, $('#goal-hint'));
  updatePace(f);
  updateActivityHint();
});

$('#profile-form').addEventListener('submit', e => {
  e.preventDefault();
  const { data, error } = readProfile(e.currentTarget);
  if (error) { toast(error, true); return; }
  const prev = state.profile;
  const prevDate = C.summarize(state, today()).goalDate;
  const replan = prev && (prev.goalKg !== data.goalKg || prevDate !== data.goalDate) && state.weights.length > 0;
  state.profile = { ...prev, ...data };
  if (replan) state.profile.plan = freshPlan();
  setSexClass();
  if (persist(replan ? 'Datos guardados. Tu plan empieza hoy: mira la línea a seguir en tu gráfica.' : 'Datos guardados.')) render();
});

function freshPlan() {
  const s = C.summarize(state, today());
  return { startDate: today(), startKg: Math.round((s.trendKg ?? s.latest?.kg) * 10) / 10 };
}

$('#plan-restart').addEventListener('click', () => {
  if (!state.weights.length) { toast('Apunta primero tu peso de hoy.', true); return; }
  if (!confirm('Tu plan volverá a empezar hoy, desde tu peso de tendencia. Tus pesadas no se tocan. ¿Seguir?')) return;
  state.profile.plan = freshPlan();
  if (persist('Tu plan empieza de nuevo hoy.')) render();
});

/* ── objetivos intermedios ──────────────────────────────────────────── */

const gdlg = $('#goal-dialog');
let editingGoal = null;

function goalIdeas(s) {
  const p = state.profile;
  const ideas = [];
  const add = (label, kg, name) => {
    const r = Math.round(kg * 10) / 10;
    if (r < s.trendKg - 0.2 && r >= p.goalKg - 0.05 && !ideas.some(i => Math.abs(i.kg - r) < 0.3)) ideas.push({ label, kg: r, name });
  };
  add(`−5 % · ${kg1(s.startKg * 0.95)} kg`, s.startKg * 0.95, '−5 %');
  add(`−10 % · ${kg1(s.startKg * 0.9)} kg`, s.startKg * 0.9, '−10 %');
  const zone = s.bmiZone?.key || '';
  if (zone.startsWith('ob')) add(`Salir de la obesidad · ${kg1(C.kgForBmi(29.9, p.heightCm))} kg`, C.kgForBmi(29.9, p.heightCm), 'Adiós obesidad');
  if (zone === 'sobrepeso' || zone.startsWith('ob')) add(`Peso normal · ${kg1(C.kgForBmi(24.9, p.heightCm))} kg`, C.kgForBmi(24.9, p.heightCm), 'Peso normal');
  add(`${Math.ceil(s.trendKg - 3)} kg`, Math.ceil(s.trendKg - 3), '');
  return ideas.slice(0, 4);
}

function updateMilestoneHint() {
  const f = $('#goal-form');
  const hint = $('#goal-dialog-hint');
  const s = C.summarize(state, today());
  const kg = num(f.elements.kg.value);
  const date = f.elements.date.value;
  const parts = [];
  if (!Number.isNaN(kg) && s.plan) {
    const pd = C.planDateForKg(s.plan, s.rateKgWeek, kg);
    if (pd && pd > today()) parts.push(`Tu plan pasa por ${kg1(kg)} kg el ${longDate(pd)}.`);
  }
  if (!Number.isNaN(kg) && date > today() && s.trendKg > kg) {
    const need = (s.trendKg - kg) / C.daysBetween(today(), date) * 7;
    parts.push(need > 1 ? `Harían falta ${kg1(need)} kg por semana: es mucho, mejor una fecha más lejana.` : `Hacen falta ${kg1(need)} kg por semana desde hoy.`);
  }
  hint.textContent = parts.join(' ');
}

function openGoal(id) {
  const f = $('#goal-form');
  f.reset();
  $('#goal-error').textContent = '';
  const s = C.summarize(state, today());
  const m = id ? state.milestones.find(x => x.id === id) : null;
  editingGoal = m ? m.id : null;
  $('#goal-title').textContent = m ? 'Objetivo' : 'Nuevo objetivo';
  $('#goal-delete-group').hidden = !m;
  f.elements.name.value = m?.name || '';
  f.elements.kg.value = m ? kg1(m.kg) : '';
  f.elements.date.value = m?.date || '';
  f.elements.date.min = C.addDays(today(), 1);
  const ideas = $('#goal-ideas');
  ideas.replaceChildren();
  const list = m || !s.hasData ? [] : goalIdeas(s);
  $('#goal-ideas-label').hidden = !list.length;
  list.forEach(idea => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ghost small';
    b.textContent = idea.label;
    b.addEventListener('click', () => {
      f.elements.kg.value = kg1(idea.kg);
      if (idea.name && !f.elements.name.value) f.elements.name.value = idea.name;
      const pd = C.planDateForKg(s.plan, s.rateKgWeek, idea.kg);
      if (!f.elements.date.value) f.elements.date.value = pd && pd > today() ? pd : C.addDays(today(), 28);
      updateMilestoneHint();
    });
    ideas.appendChild(b);
  });
  updateMilestoneHint();
  gdlg.showModal();
}

$('#goals').addEventListener('click', e => {
  const row = e.target.closest('[data-goal]');
  if (!row) return;
  if (!state.weights.length) { toast('Apunta primero tu peso de hoy.', true); return; }
  openGoal(row.dataset.goal || null);
});
$('#goal-cancel').addEventListener('click', () => gdlg.close());
gdlg.addEventListener('click', e => { if (e.target === gdlg) gdlg.close(); });
$('#goal-form').addEventListener('input', updateMilestoneHint);

$('#goal-form').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.currentTarget;
  const err = $('#goal-error');
  const s = C.summarize(state, today());
  const name = f.elements.name.value.trim().slice(0, 24);
  const kg = num(f.elements.kg.value);
  const date = f.elements.date.value;
  if (Number.isNaN(kg) || kg < 30 || kg > 300) { err.textContent = 'Escribe el peso del objetivo en kilos, por ejemplo 88.'; return; }
  if (!editingGoal && kg >= s.trendKg) { err.textContent = `Ese peso ya lo tienes: tu tendencia está en ${kg1(s.trendKg)} kg.`; return; }
  if (!date || (!editingGoal && date <= today())) { err.textContent = 'Elige una fecha a partir de mañana.'; return; }
  const id = editingGoal || `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  state.milestones = [...(state.milestones || []).filter(x => x.id !== id), { id, name, kg, date }];
  if (persist(editingGoal ? 'Objetivo guardado.' : 'Objetivo añadido: míralo en la gráfica.')) { gdlg.close(); render(); }
});

$('#goal-delete').addEventListener('click', () => {
  if (!editingGoal) return;
  const m = state.milestones.find(x => x.id === editingGoal);
  const label = m?.name || `${kg1(m?.kg)} kg`;
  if (!confirm(`¿Borrar el objetivo «${label}»?`)) return;
  state.milestones = state.milestones.filter(x => x.id !== editingGoal);
  if (persist('Objetivo borrado.')) { gdlg.close(); render(); }
});

/* ── hábitos ────────────────────────────────────────────────────────── */

const HABIT_FIELDS = ['exerciseType', 'exerciseDays', 'exerciseMinutes', 'work', 'steps', 'exerciseCredit', 'oil', 'portions', 'dislikes', 'allergies', 'reasons'];

function fillHabitsForm() {
  const f = $('#habits-form');
  const h = state.habits || {};
  HABIT_FIELDS.forEach(k => { f.elements[k].value = h[k] ?? ''; });
  ['work', 'steps', 'exerciseCredit', 'oil', 'portions'].forEach(k => setPickerValue(f, k, h[k] ?? ''));
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
  b.className = 'btn ghost small';
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

// La automática: tras cada cambio (esperando unos segundos a que acabes) y al abrir.
let backupTimer = null;
let backupResult = null;
function scheduleBackup() {
  clearTimeout(backupTimer);
  backupTimer = setTimeout(() => runBackup(), 8000);
}

async function runBackup({ gesture = false, explicit = false } = {}) {
  if (!S.canSave()) return null;          // tras una carga ilegible no se copia nada
  const hasData = !!state.profile && (state.weights.length > 0 || Object.keys(state.food || {}).length > 0);
  backupResult = await CP.autoBackup(S.exportText(state), { today: today(), gesture, explicit, hasData });
  renderBackupUi();
  return backupResult;
}

function lastText(d) {
  if (!d) return '';
  const hm = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const days = C.daysBetween(iso, today());
  return days === 0 ? `hoy a las ${hm}` : days === 1 ? `ayer a las ${hm}` : `el ${longDate(iso)}`;
}

let backupUiSeq = 0;
async function renderBackupUi() {
  const seq = ++backupUiSeq;
  const st = await CP.status();
  if (seq !== backupUiSeq) return;                 // llegó otra más nueva
  const sub = $('#auto-backup-sub'), val = $('#auto-backup-state'), status = $('#backup-status');
  status.classList.remove('warn');
  $('#auto-backup-change').hidden = !st.folder;
  const manual = state.meta?.lastBackup;
  if (!st.supported) {
    sub.textContent = 'Este navegador no deja guardar en carpetas: te aviso cada semana para guardarla de un toque.';
    val.textContent = 'Semanal';
  } else if (!st.folder) {
    sub.textContent = 'Elige una vez una carpeta del móvil y se guardará sola cada día.';
    val.textContent = 'Activar';
  } else if (st.perm === 'granted') {
    sub.textContent = `En la carpeta «${st.folder}»${st.last ? ` · última ${lastText(st.last)}` : ''}`;
    val.textContent = 'Activada';
  } else {
    sub.textContent = `En la carpeta «${st.folder}» · falta darle permiso otra vez`;
    val.textContent = 'Permitir';
  }
  const lastAny = [st.last ? st.last.getTime() : 0, manual ? C.parseDate(manual).getTime() : 0].reduce((a, b) => Math.max(a, b), 0);
  const days = lastAny ? Math.floor((Date.now() - lastAny) / 86400000) : null;
  status.textContent = !lastAny ? 'Todavía no hay ninguna copia fuera de la app.'
    : st.last && st.last.getTime() === lastAny ? `Última copia automática: ${lastText(st.last)}.`
      : `Última copia: ${longDate(manual)}${days > 0 ? ` (hace ${days} ${days === 1 ? 'día' : 'días'})` : ' (hoy)'}.`;
  if ((days == null && state.weights.length >= 7) || days > 14) status.classList.add('warn');
  renderBackupNudge(st, days);
}

// En Hoy: activar la copia, darle permiso otra vez, o (sin carpetas) la copia de la semana.
function renderBackupNudge(st, days) {
  const card = $('#backup-nudge');
  const snoozed = (() => { try { return Number(localStorage.getItem('trampantojo:copia-aviso') || 0) > Date.now(); } catch { return false; } })();
  let kind = null;
  if (state.profile && !snoozed) {
    if (st.supported && !st.folder && state.weights.length >= 2) kind = 'activar';
    else if (st.folder && st.perm !== 'granted' && CP.due(20)) kind = 'permiso';
    else if (!st.supported && state.weights.length >= 3 && (days == null || days >= 7)) kind = 'semanal';
  }
  card.hidden = !kind;
  card.dataset.kind = kind || '';
  if (!kind) return;
  const T = {
    activar: ['Protege tus datos', 'Activa la copia automática', 'Eliges una vez una carpeta del móvil (Documentos, por ejemplo) y la app guarda ahí tu copia cada día, sola. Aunque borres los datos de Chrome o cambies de móvil, tus pesadas siguen ahí.', 'Elegir carpeta'],
    permiso: ['Tu copia', 'La copia de hoy está pendiente', `Chrome pide permiso otra vez para seguir guardando en «${st.folder}». Es un toque.`, 'Permitir y guardar'],
    semanal: ['Tu copia', days == null ? 'Aún no tienes ninguna copia' : `Hace ${days} días de tu última copia`, 'Guárdala de un toque: mándala a Drive o a tu correo. Si algún día borras los datos de Chrome, la recuperas con «Cargar copia».', 'Guardar copia'],
  }[kind];
  $('#nudge-eyebrow').textContent = T[0];
  $('#nudge-title').textContent = T[1];
  $('#nudge-text').textContent = T[2];
  $('#nudge-go').textContent = T[3];
}

async function chooseBackupFolder() {
  try {
    const r = await CP.chooseFolder(S.exportText(state), today());
    toast(`Copia automática activada en «${r.folder}». Se guardará sola cada día.`);
  } catch (err) {
    if (err?.name !== 'AbortError') toast('No he podido usar esa carpeta. Prueba con Documentos o Descargas.', true);
  }
  renderBackupUi();
}

async function shareBackup() {
  const how = await CP.shareOrDownload(S.exportText(state), today());
  if (how === 'cancelled') return;
  state.meta = { ...state.meta, lastBackup: today() };
  if (persist(how === 'shared' ? 'Copia enviada. Guárdala en Drive o en tu correo.' : 'Copia guardada en Descargas.')) render();
}

async function backupNow() {
  const r = await runBackup({ gesture: true, explicit: true });
  if (r?.ok) toast(`Copia guardada en «${r.folder}».`);
  else if (r?.reason === 'permiso') toast('Sin permiso no puedo guardar en esa carpeta. Puedes elegir otra.', true);
  else if (r?.reason === 'vacia') toast('Todavía no hay nada que guardar.');
  else if (r?.reason === 'error') toast('No he podido escribir en la carpeta. Prueba a elegirla otra vez.', true);
}

$('#auto-backup').addEventListener('click', async () => {
  const st = await CP.status();
  if (!st.supported) return shareBackup();
  if (!st.folder) return chooseBackupFolder();
  return backupNow();
});
$('#auto-backup-change').addEventListener('click', chooseBackupFolder);
$('#nudge-go').addEventListener('click', () => {
  const kind = $('#backup-nudge').dataset.kind;
  if (kind === 'activar') chooseBackupFolder();
  else if (kind === 'permiso') backupNow();
  else if (kind === 'semanal') shareBackup();
});
$('#nudge-later').addEventListener('click', () => {
  try { localStorage.setItem('trampantojo:copia-aviso', String(Date.now() + 3 * 86400000)); } catch { /* da igual */ }
  $('#backup-nudge').hidden = true;
});

$('#export').addEventListener('click', shareBackup);

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
    document.body.classList.toggle('welcoming', !state.profile);
    render();
  }
});

/* ── primera vez ────────────────────────────────────────────────────── */

function startWelcome() {
  const w = $('#welcome');
  const f = $('#welcome-form');
  setPickerValue(f, 'activity', 'sedentario');
  let step = 1;
  const show = () => {
    $$('.step', f).forEach(s => { s.hidden = Number(s.dataset.step) !== step; });
    $('#welcome-back').hidden = step === 1;
    $('#welcome-next').textContent = step === 1 ? 'Continuar' : 'Empezar';
    $('#welcome-error').textContent = '';
  };
  $('#welcome-back').addEventListener('click', () => { step = 1; show(); });
  f.addEventListener('input', e => {
    updateGoalHint(f, $('#welcome-goal-hint'));
    if (e.target.name === 'goalDate') f.dataset.dateTouched = '1';
    // con peso y meta escritos y sin fecha elegida, se propone la del ritmo normal
    if ((e.target.name === 'kg' || e.target.name === 'goalKg') && !f.dataset.dateTouched) {
      const kg = num(f.elements.kg.value), goal = num(f.elements.goalKg.value);
      f.elements.goalDate.value = !Number.isNaN(kg) && !Number.isNaN(goal) && kg > goal ? C.dateForRate(today(), kg, goal, 0.5) : '';
    }
    if (step === 2) updatePace(f);
  });
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
      updatePace(f);
      f.elements.kg.focus();
      return;
    }
    const kg = num(f.elements.kg.value);
    if (Number.isNaN(kg) || kg < 25 || kg > 350) { err.textContent = 'Escribe tu peso de hoy en kilos, por ejemplo 84,6.'; return; }
    const { data, error } = readProfile(f);
    if (error) { err.textContent = error; return; }
    state.profile = { ...data, createdAt: today(), plan: { startDate: today(), startKg: kg } };
    upsertEntry({ date: today(), kg });
    setSexClass();
    if (persist(`${data.sex === 'm' ? 'Bienvenida' : 'Bienvenido'}, ${data.name}. Mañana, otra vez a la báscula.`)) {
      w.hidden = true;
      document.body.classList.remove('welcoming');
      S.askPersistence();
      go('hoy');
    }
  });
  show();
  w.hidden = false;
  document.body.classList.add('welcoming');
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

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  if (state.profile) render();
  syncWater();
  checkForUpdate();
});

/* Al volver a la app, si en GitHub hay una versión más nueva, se recarga sola.
   Sin esto, una app que se quedó abierta en segundo plano seguía enseñando la
   versión vieja hasta cerrarla del todo. No recarga si estás a mitad de algo
   (una hoja abierta o escribiendo): lo intentará la próxima vez. */
let lastUpdateCheck = 0;
async function checkForUpdate() {
  if (Date.now() - lastUpdateCheck < 60000 || !navigator.onLine) return;
  lastUpdateCheck = Date.now();
  try {
    const res = await fetch(`index.html?check=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const live = (await res.text()).match(/app\.js\?v=([0-9.]+)/)?.[1];
    const busy = document.querySelector('dialog[open]') || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
    if (live && live !== VERSION && !busy) location.reload();
  } catch { /* sin conexión: ya lo miraremos */ }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.warn('[sw]', err));
}

applyTheme(themeChoice());
startAmbient();
comidas = initComidas({ getState: () => state, persist, toast, today, render });
initAntojo({ getState: () => state, persist, toast, today, render, summary: () => C.summarize(state, today()) });
setSexClass();
setTimeout(() => { if (CP.due(12)) runBackup(); else renderBackupUi(); }, 2500);
syncWater();
if (loaded.status === 'unreadable') showStorageAlert();
else if (!state.profile) startWelcome();
go(location.hash.slice(1) || 'hoy', { push: false });
