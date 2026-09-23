/* Trampantojo — la hoja de «Tengo un antojo» (la lógica está en antojo.js). */

import { CRAVINGS, MOODS, HUNGER, SLEEP, explain, cost, alternatives, portionOf, smallerPortion, cravingStats, analyzeCravings, BLOCKS } from './antojo.js?v=0.7.0';

const $ = (sel, root = document) => root.querySelector(sel);
let intFmt;
try { intFmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' }); }
catch { intFmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }); }
const int = v => intFmt.format(Math.round(v));
const kg1 = v => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v);

const WAIT_SECONDS = 10 * 60;
const WAIT_TIPS = [
  'Bebe un vaso grande de agua, despacio.',
  'Sal a dar una vuelta a la manzana, aunque sean cinco minutos.',
  'Lávate los dientes: para el cerebro, la cocina cierra.',
  'Escribe o llama a alguien.',
  'Respira: cuatro segundos dentro, seis fuera, cinco veces.',
  'Cambia de habitación o de actividad.',
  'Haz diez sentadillas o estira la espalda.',
  'Mastica un chicle sin azúcar.',
  'Ponte una canción que te guste y escúchala entera.',
];

export function initAntojo(ctx) {
  const { getState, persist, toast, today, render, summary } = ctx;
  const dlg = $('#craving-dialog');
  const steps = ['step1', 'step2', 'step3', 'timer', 'alts', 'eatview', 'done'];
  const show = id => steps.forEach(s => { $(`#crv-${s}`).hidden = s !== id; });
  let cur = null;          // el antojo en curso
  let timer = null;

  const female = () => getState().profile?.sex === 'm';

  function newCraving() {
    const now = new Date();
    return { id: `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, t: now.getTime(), date: today(), hour: now.getHours(), weekday: now.getDay(), type: null, hunger: null, mood: null, sleep: null, outcome: null };
  }

  function save(c) {
    const st = getState();
    st.cravings = [...(st.cravings || []).filter(x => x.id !== c.id), c];
    persist();
  }

  /* ── abrir ────────────────────────────────────────────────────────── */

  function open() {
    cur = newCraving();
    $('#crv-title').textContent = 'Tengo un antojo';
    const grid = $('#crv-types');
    grid.replaceChildren();
    CRAVINGS.forEach(c => {
      const p = portionOf(c.food);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'crv-type';
      const l = document.createElement('span'); l.className = 'crv-type-label'; l.textContent = c.label;
      const k = document.createElement('span'); k.className = 'crv-type-kcal'; k.textContent = p ? `~${int(p.kcal)} kcal` : '';
      b.append(l, k);
      b.addEventListener('click', () => { cur.type = c.id; step2(); });
      grid.appendChild(b);
    });
    show('step1');
    dlg.showModal();
  }

  /* ── tres preguntas ───────────────────────────────────────────────── */

  function segmented(container, options, key) {
    container.replaceChildren();
    options.forEach(o => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      b.textContent = o.label;
      b.addEventListener('click', () => {
        cur[key] = o.v;
        [...container.children].forEach(x => x.setAttribute('aria-checked', String(x === b)));
      });
      container.appendChild(b);
    });
  }

  function step2() {
    segmented($('#crv-hunger'), HUNGER, 'hunger');
    segmented($('#crv-sleep'), SLEEP, 'sleep');
    const moods = $('#crv-mood');
    moods.replaceChildren();
    MOODS.forEach(m => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ghost small';
      b.setAttribute('aria-pressed', 'false');
      b.textContent = m.label[female() ? 1 : 0];
      b.addEventListener('click', () => {
        cur.mood = m.id;
        [...moods.children].forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      });
      moods.appendChild(b);
    });
    show('step2');
  }

  /* ── por qué te pasa ──────────────────────────────────────────────── */

  function step3() {
    if (cur.hunger == null) { toast('Dime cuánta hambre de estómago tienes.', true); return; }
    const st = getState();
    const s = summary();
    const craving = CRAVINGS.find(c => c.id === cur.type);
    const entries = st.food?.[today()] || [];
    const logged = entries.length > 0;
    const eaten = entries.reduce((a, e) => a + (e.kcal || 0), 0);
    const protein = entries.reduce((a, e) => a + (e.p || 0), 0);
    const lastT = entries.reduce((a, e) => Math.max(a, e.t || 0), 0);
    const hoursSinceMeal = lastT ? (Date.now() - lastT) / 3600000 : null;
    const same = (st.cravings || []).filter(c => c.id !== cur.id && Math.abs(c.hour - cur.hour) <= 1).length;
    const reasons = explain({
      hour: cur.hour, weekday: cur.weekday, hunger: cur.hunger, mood: cur.mood, sleep: cur.sleep, craving,
      eatenKcal: eaten, proteinG: protein, logged, hoursSinceMeal: hoursSinceMeal ?? 0,
      target: s.target?.kcal, proteinTarget: s.protein ? (s.protein[0] + s.protein[1]) / 2 : null,
      daysTracked: s.daysTracked, sameHourCount: same,
      stalled: !!(s.rate && s.rate.perWeek > -0.05 && s.daysTracked > 21),
    });
    const why = $('#crv-why');
    why.replaceChildren();
    reasons.forEach(r => {
      const t = document.createElement('p'); t.className = 'message-title'; t.textContent = r.title;
      const x = document.createElement('p'); x.className = 'message-text'; x.textContent = r.text;
      why.append(t, x);
    });
    $('#crv-basis').textContent = logged
      ? `Lo he mirado con lo que llevas hoy: ${int(eaten)} kcal y ${int(protein)} g de proteína${hoursSinceMeal != null ? `, lo último hace ${hoursSinceMeal < 1 ? 'menos de una hora' : `${Math.floor(hoursSinceMeal)} h`}` : ''}.`
      : 'Hoy no has apuntado comidas, así que te lo explico por lo que me cuentas. Si las apuntas, afino más.';

    const p = portionOf(craving.food);
    const remaining = s.target ? s.target.kcal - eaten : null;
    const c = cost({ kcal: p.kcal, weightKg: s.trendKg, remaining, target: s.target?.kcal });
    $('#crv-kcal').textContent = `${int(c.kcal)} kcal`;
    const bits = [`${portionText(p)} de ${p.item.n.toLowerCase()}`, `unos ${c.walkMin} minutos andando a paso ligero`];
    if (c.pctRemaining != null && c.pctRemaining > 0 && logged) bits.push(`el ${c.pctRemaining} % de lo que te queda hoy`);
    else if (c.pctTarget) bits.push(`el ${c.pctTarget} % de todo tu día`);
    $('#crv-cost').textContent = `${bits.join(' · ')}. Un día no es nada; hecho cada día a esta hora, serían ${kg1(c.kgYearIfDaily)} kg en un año.`;

    const reasonsText = (st.habits?.reasons || '').trim();
    $('#crv-reasons').textContent = reasonsText || 'Todavía no has escrito tus razones para adelgazar. Hazlo en Perfil › Tus razones: leídas en este momento, convencen más que cualquier cosa que te diga yo.';
    $('#crv-reasons-card').classList.toggle('empty-reasons', !reasonsText);
    save(cur);
    show('step3');
    $('#craving-dialog').scrollTop = 0;
  }

  function portionText(p) {
    if (p.qty === 1) return `1 ${p.unit}`;
    if (p.qty === 0.5) return `media ${p.unit}`;
    const plural = /[aeiou]$/.test(p.unit) ? p.unit + 's' : p.unit.includes(' ') ? p.unit : p.unit + 'es';
    return `${String(p.qty).replace('.', ',')} ${plural}`;
  }

  /* ── salida 1: esperar 10 minutos ─────────────────────────────────── */

  function startWait() {
    cur.outcome = 'esperando';
    save(cur);
    show('timer');
    const end = Date.now() + WAIT_SECONDS * 1000;
    const ring = $('#crv-ring-fg');
    const R = 54, C = 2 * Math.PI * R;
    ring.setAttribute('stroke-dasharray', `${C} ${C}`);
    let tip = 0;
    $('#crv-tip').textContent = WAIT_TIPS[0];
    $('#crv-timer-end').hidden = true;
    $('#crv-timer-running').hidden = false;
    clearInterval(timer);
    const tick = () => {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      $('#crv-clock').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      ring.setAttribute('stroke-dashoffset', String(C * left / WAIT_SECONDS));
      const elapsed = WAIT_SECONDS - left;
      const nt = Math.floor(elapsed / 40) % WAIT_TIPS.length;
      if (nt !== tip) { tip = nt; $('#crv-tip').textContent = WAIT_TIPS[tip]; }
      if (left === 0) {
        clearInterval(timer); timer = null;
        $('#crv-timer-running').hidden = true;
        $('#crv-timer-end').hidden = false;
        if (navigator.vibrate) navigator.vibrate([120, 80, 120]);
      }
    };
    tick();
    timer = setInterval(tick, 1000);
  }

  /* ── salida 2: una alternativa sana ───────────────────────────────── */

  function showAlts() {
    const st = getState();
    const craving = CRAVINGS.find(c => c.id === cur.type);
    const list = $('#crv-alt-list');
    list.replaceChildren();
    const alts = alternatives(craving.kind, cur.hunger ?? 5, st.habits);
    $('#crv-alt-intro').textContent = (cur.hunger ?? 0) >= 7
      ? 'Tienes hambre de verdad: primero, algo que sacie. Elige y lo apunto por ti.'
      : `Para ese antojo de ${craving.label.toLowerCase()}, algo que lo calma por mucho menos. Elige y lo apunto por ti.`;
    alts.forEach(a => {
      const p = portionOf(a.food);
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'log-row';
      const main = document.createElement('span'); main.className = 'log-main';
      const t = document.createElement('span'); t.className = 'log-date'; t.textContent = a.label;
      main.appendChild(t);
      const side = document.createElement('span'); side.className = 'log-side';
      const k = document.createElement('span'); k.className = 'log-change'; k.textContent = p ? `${int(p.kcal)} kcal` : '';
      side.appendChild(k);
      b.append(main, side);
      b.addEventListener('click', () => {
        if (p) logFood(p);
        finish('alternativa', `Buena elección: ${a.label.toLowerCase()} (${int(p?.kcal || 0)} kcal) en vez de ${int(portionOf(craving.food).kcal)}.`);
      });
      li.appendChild(b);
      list.appendChild(li);
    });
    show('alts');
  }

  /* ── salida 3: comérselo con cabeza ───────────────────────────────── */

  function showEat() {
    const craving = CRAVINGS.find(c => c.id === cur.type);
    const small = smallerPortion(craving);
    $('#crv-eat-portion').textContent = `${portionText(small)} de ${small.item.n.toLowerCase()}: ${int(small.kcal)} kcal`;
    $('#crv-eat-add').onclick = () => { logFood(small); finish('comido', 'Apuntado, sin culpa. Disfrútalo despacio: mañana seguimos.'); };
    show('eatview');
  }

  function logFood(p) {
    const st = getState();
    st.food = st.food || {};
    const arr = st.food[today()] || (st.food[today()] = []);
    arr.push({
      id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, meal: 'picoteo', t: Date.now(),
      name: p.item.n, unit: p.unit, qty: p.qty, grams: p.grams, kcal: p.kcal, p: p.p, c: p.c, f: p.f, src: 'tabla', ref: p.item.id,
    });
  }

  /* ── final ────────────────────────────────────────────────────────── */

  function finish(outcome, msg) {
    clearInterval(timer); timer = null;
    cur.outcome = outcome;
    save(cur);
    const st = getState();
    const stats = cravingStats(st.cravings, today());
    const won = outcome === 'resistido' || outcome === 'alternativa';
    $('#crv-done-title').textContent = won ? '¡Antojo vencido!' : 'Hecho, y sin culpa';
    $('#crv-done-text').textContent = msg;
    $('#crv-done-stats').textContent = stats.total30
      ? `Este mes: ${stats.beaten30} de ${stats.total30} antojos vencidos.`
      : '';
    show('done');
    render();
  }

  /* ── botones ──────────────────────────────────────────────────────── */

  document.querySelectorAll('[data-craving]').forEach(b => b.addEventListener('click', open));
  $('#crv-close').addEventListener('click', () => dlg.close());
  $('#crv-go').addEventListener('click', step3);
  $('#crv-wait').addEventListener('click', startWait);
  $('#crv-alt').addEventListener('click', showAlts);
  $('#crv-eat').addEventListener('click', showEat);
  $('#crv-passed').addEventListener('click', () => finish('resistido', 'Se ha pasado solo, como las olas. Esto es lo que entrena el hábito.'));
  $('#crv-early').addEventListener('click', () => finish('resistido', 'Se te ha pasado antes de los diez minutos. Muy bien.'));
  $('#crv-yes').addEventListener('click', () => finish('resistido', 'Diez minutos y se ha ido. Así se hace.'));
  $('#crv-no').addEventListener('click', showAlts);
  $('#crv-alt-back').addEventListener('click', () => show('step3'));
  $('#crv-eat-back').addEventListener('click', () => show('step3'));
  $('#crv-done-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => {
    clearInterval(timer); timer = null;
    if (cur && cur.outcome === 'esperando') { cur.outcome = null; save(cur); }
  });
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  return { open };
}

/* ── la tarjeta de Evolución: tu mapa de antojos ────────────────────── */

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_NAMES = ['los lunes', 'los martes', 'los miércoles', 'los jueves', 'los viernes', 'los sábados', 'los domingos'];

export function renderCravingCard(container, cravings, todayIso, food, proteinTarget) {
  renderCravingMap(container, cravings, todayIso);
  if (!cravings?.length) return;
  const { insights, need } = analyzeCravings(cravings, food, todayIso, proteinTarget);
  const box = document.createElement('div');
  box.className = 'insights';
  const t = document.createElement('p');
  t.className = 'eyebrow';
  t.textContent = 'Por qué te dan, con tus datos';
  box.appendChild(t);
  if (need > 0) {
    const p = document.createElement('p');
    p.className = 'card-foot';
    p.textContent = `Con ${need} ${need === 1 ? 'antojo más' : 'antojos más'} registrado${need === 1 ? '' : 's'} te doy tu análisis: cruzo tus antojos con lo que comes cada día.`;
    box.appendChild(p);
  } else if (!insights.length) {
    const p = document.createElement('p');
    p.className = 'card-foot';
    p.textContent = 'De momento no veo un patrón claro entre tus antojos y lo que comes. Cuantas más comidas apuntes, más afino.';
    box.appendChild(p);
  } else {
    insights.forEach(i => {
      const h = document.createElement('p'); h.className = 'message-title'; h.textContent = i.title;
      const x = document.createElement('p'); x.className = 'message-text'; x.textContent = i.text;
      box.append(h, x);
    });
  }
  container.appendChild(box);
}

function renderCravingMap(container, cravings, todayIso) {
  container.replaceChildren();
  if (!cravings?.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Cuando pulses «Tengo un antojo», aquí verás a qué horas y qué días te dan, y cuántos has vencido.';
    container.appendChild(p);
    return;
  }
  const st = cravingStats(cravings, todayIso);
  const head = document.createElement('p');
  head.className = 'card-sub';
  head.textContent = `Últimos 30 días: ${st.total30} ${st.total30 === 1 ? 'antojo' : 'antojos'}, ${st.beaten30} ${st.beaten30 === 1 ? 'vencido' : 'vencidos'}.`
    + (st.peak && st.peak.n >= 2 ? ` Te dan más ${DAY_NAMES[st.peak.d]} por la ${BLOCKS[st.peak.b].label.toLowerCase().replace('mediodía', 'hora de comer').replace('madrugada', 'madrugada').replace('mañana', 'mañana')}.` : '');
  container.appendChild(head);
  const max = Math.max(1, ...st.grid.flat());
  const grid = document.createElement('div');
  grid.className = 'heat';
  grid.setAttribute('role', 'table');
  grid.setAttribute('aria-label', 'Antojos por día de la semana y momento del día');
  const corner = document.createElement('span'); corner.className = 'heat-h';
  grid.appendChild(corner);
  BLOCKS.forEach(b => { const h = document.createElement('span'); h.className = 'heat-h'; h.textContent = b.label.slice(0, 3); grid.appendChild(h); });
  st.grid.forEach((row, d) => {
    const dl = document.createElement('span'); dl.className = 'heat-d'; dl.textContent = DAYS[d];
    grid.appendChild(dl);
    row.forEach((n, b) => {
      const c = document.createElement('span');
      c.className = 'heat-c';
      c.style.setProperty('--lvl', String(n / max));
      c.title = `${DAY_NAMES[d]}, ${BLOCKS[b].label.toLowerCase()}: ${n} ${n === 1 ? 'antojo' : 'antojos'}`;
      if (n) c.textContent = String(n);
      grid.appendChild(c);
    });
  });
  container.appendChild(grid);
}
