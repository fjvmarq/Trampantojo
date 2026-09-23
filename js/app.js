/* Trampantojo — el hilo de la app: pantallas, formularios y lo que se pinta.
   Los números salen de calc.js, lo guardado de store.js y los gráficos de
   charts.js. Aquí sólo se decide qué se enseña y cuándo. */

import * as C from './calc.js?v=0.6.1';
import * as S from './store.js?v=0.6.1';
import { weightChart, rateChart, kcalChart, kg1, signed1, shortDate, longDate } from './charts.js?v=0.6.1';
import { initComidas } from './comidas.js?v=0.6.1';
import { initAntojo, renderCravingCard } from './antojo-ui.js?v=0.6.1';
import { messageOfTheDay } from './messages.js?v=0.6.1';
import { startAmbient } from './ambient.js?v=0.6.1';

const VERSION = '0.6.1';

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
  rateChart($('#chart-rate'), s.weekly);
  kcalChart($('#chart-kcal'), { food: state.food, target: s.target?.kcal, today: s.today });
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

const HABIT_FIELDS = ['exerciseType', 'exerciseDays', 'exerciseMinutes', 'work', 'steps', 'oil', 'portions', 'dislikes', 'allergies', 'reasons'];

function fillHabitsForm() {
  const f = $('#habits-form');
  const h = state.habits || {};
  HABIT_FIELDS.forEach(k => { f.elements[k].value = h[k] ?? ''; });
  ['work', 'steps', 'oil', 'portions'].forEach(k => setPickerValue(f, k, h[k] ?? ''));
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

document.addEventListener('visibilitychange', () => { if (!document.hidden && state.profile) render(); });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.warn('[sw]', err));
}

applyTheme(themeChoice());
startAmbient();
comidas = initComidas({ getState: () => state, persist, toast, today, render });
initAntojo({ getState: () => state, persist, toast, today, render, summary: () => C.summarize(state, today()) });
setSexClass();
if (loaded.status === 'unreadable') showStorageAlert();
else if (!state.profile) startWelcome();
go(location.hash.slice(1) || 'hoy', { push: false });
