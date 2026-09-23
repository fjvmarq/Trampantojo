/* Trampantojo — los gráficos, en SVG y sin librerías.

   Colores y trazos salen de las variables CSS (--chart-trend, --chart-grid…), así que
   el modo oscuro no se toca aquí. Reglas: líneas de 2 px, rejilla fina y
   discreta, una etiqueta sólo donde importa (el último valor) y el resto
   en el recuadro que sale al tocar. */

import { addDays, daysBetween, parseDate, planKgAt, PLAN_LANE } from './calc.js?v=0.7.1';

const NS = 'http://www.w3.org/2000/svg';
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmt1 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const kg1 = v => fmt1.format(v);
export const signed1 = v => (v > 0.05 ? '+' : v < -0.05 ? '−' : '') + fmt1.format(Math.abs(v));

function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}

function text(parent, x, y, str, cls, anchor = 'start') {
  const t = el('text', { x, y, class: cls, 'text-anchor': anchor }, parent);
  t.textContent = str;
  return t;
}

export function shortDate(iso) {
  const d = parseDate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function longDate(iso) {
  return parseDate(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

// Día en que el plan llega a la meta y se queda plano (el codo del carril).
function planKinkDate(plan, rateKgWeek, goalKg) {
  if (!plan || !(rateKgWeek > 0) || plan.startKg <= goalKg) return null;
  return addDays(plan.startDate, Math.ceil((plan.startKg - goalKg) / (rateKgWeek / 7)));
}

function niceStep(range, target) {
  const raw = range / target;
  return [0.2, 0.5, 1, 2, 5, 10, 20, 50].find(s => s >= raw) ?? 100;
}

function tooltip(container) {
  let tip = container.querySelector(':scope > .tip');
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'tip';
    tip.setAttribute('role', 'status');
    container.appendChild(tip);
  }
  return tip;
}

function showTip(container, tip, lines, x, y) {
  tip.replaceChildren();
  lines.forEach(([cls, str]) => {
    const d = document.createElement('div');
    d.className = cls;
    d.textContent = str;
    tip.appendChild(d);
  });
  tip.hidden = false;
  const w = tip.offsetWidth, cw = container.clientWidth;
  let left = x + 12;
  if (left + w > cw - 4) left = x - w - 12;
  tip.style.left = Math.max(4, left) + 'px';
  tip.style.top = Math.max(0, y - tip.offsetHeight - 10) + 'px';
}

/* ── evolución del peso ─────────────────────────────────────────────── */

/* opts: daily (serie diaria con trend y kg|null), goalKg, healthy [lo, hi],
         rangeDays (null = todo), perWeek (para la proyección), compact,
         plan + rateKgWeek (el carril de tu plan), milestones (objetivos con estado),
         journey + goalDate: «tu camino», desde que empezaste hasta la fecha de la
         meta, con la línea que deberías seguir aunque aún no haya datos */
export function weightChart(container, opts) {
  const { daily, goalKg, healthy, rangeDays, perWeek, compact, plan, rateKgWeek, goalDate } = opts;
  const journey = !!opts.journey && !!goalDate && !!plan;
  const milestones = opts.milestones || [];
  container.replaceChildren();
  container.classList.add('chart');
  if (!daily?.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Cuando apuntes tu primer peso, aquí verás su evolución.';
    container.appendChild(p);
    return;
  }

  const lastDate = daily[daily.length - 1].date;
  const from = rangeDays && !journey ? addDays(lastDate, -(rangeDays - 1)) : daily[0].date;
  const vis = daily.filter(d => d.date >= from);
  const span = Math.max(1, daysBetween(vis[0].date, lastDate));

  const lastTrend = vis[vis.length - 1].trend;
  const projecting = (!compact || journey) && perWeek != null && perWeek < -0.05 && lastTrend - goalKg > 0.25;
  let future = projecting ? Math.max(7, Math.round(span * 0.25)) : 0;
  // tu camino llega hasta la fecha de la meta (y un pelo más, para que se vea la bandera)
  if (journey && goalDate > lastDate) {
    const toGoal = daysBetween(lastDate, goalDate);
    future = toGoal + Math.max(2, Math.round((span + toGoal) * 0.03));
  }
  // el próximo objetivo siempre entra en el gráfico (hasta seis meses vista):
  // es lo que responde a «¿voy a buen ritmo?»
  const nextM = compact || journey ? null : milestones.find(mm => mm.date > lastDate && mm.status !== 'conseguido');
  if (nextM) {
    const need = daysBetween(lastDate, nextM.date) + 4;
    if (need <= 183) future = Math.max(future, need);
  }
  const endDate = addDays(lastDate, future);
  const projEnd = projecting ? Math.max(goalKg, lastTrend + perWeek / 7 * future) : null;

  // eje vertical: los datos mandan; la meta entra sólo si no aplasta la línea
  const vals = [];
  vis.forEach(d => { vals.push(d.trend); if (d.kg != null) vals.push(d.kg); });
  if (projEnd != null) vals.push(projEnd);
  const planAt = date => planKgAt(plan, rateKgWeek, goalKg, date);
  const laneFrom = plan && plan.startDate > vis[0].date ? plan.startDate : vis[0].date;
  const laneOn = plan && laneFrom <= endDate && planAt(laneFrom) != null;
  if (laneOn) [laneFrom, endDate].forEach(d => { const v = planAt(d); vals.push(v + PLAN_LANE, v - PLAN_LANE); });
  const msIn = milestones.filter(mm => mm.date >= vis[0].date && mm.date <= endDate);
  msIn.forEach(mm => vals.push(mm.kg));
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const dataSpan = Math.max(hi - lo, 1);
  const goalIn = journey || (goalKg >= lo - dataSpan * 0.5 && goalKg <= hi + dataSpan * 0.5);
  if (goalIn) { lo = Math.min(lo, goalKg); hi = Math.max(hi, goalKg); }
  const pad = Math.max(0.3, (hi - lo) * 0.08);
  lo -= pad; hi += pad;
  const step = niceStep(hi - lo, compact && !journey ? 3 : 4);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;

  const W = Math.max(280, container.clientWidth);
  const H = journey && compact ? 210 : compact ? 170 : 240;
  const m = { l: 34, r: 62, t: 14, b: 24 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const totalDays = Math.max(1, daysBetween(vis[0].date, endDate));
  const X = date => m.l + daysBetween(vis[0].date, date) / totalDays * iw;
  const Y = v => m.t + (hi - v) / (hi - lo) * ih;

  const svg = el('svg', {
    width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img',
    'aria-label': `Evolución del peso: tendencia actual ${kg1(lastTrend)} kg`,
  }, container);

  // franja de peso saludable
  if (healthy) {
    const top = Math.min(hi, healthy[1]), bottom = Math.max(lo, healthy[0]);
    if (top > bottom) {
      el('rect', { x: m.l, y: Y(top), width: iw, height: Y(bottom) - Y(top), class: 'band-good' }, svg);
      if (Y(bottom) - Y(top) >= 16) text(svg, m.l + 6, Y(top) + 12, 'Peso saludable', 'band-label');
    }
  }

  // rejilla y eje vertical
  for (let v = lo; v <= hi + 1e-9; v += step) {
    const y = Y(v);
    el('line', { x1: m.l, x2: m.l + iw, y1: y, y2: y, class: 'grid' }, svg);
    text(svg, m.l - 6, y + 4, step < 1 ? kg1(v) : String(Math.round(v)), 'axis', 'end');
  }

  // eje de fechas: 3–5 marcas repartidas por todo el eje (futuro incluido)
  const nTicks = Math.min(compact || W < 420 ? 3 : 5, totalDays + 1);
  for (let i = 0; i < nTicks; i++) {
    const d = addDays(vis[0].date, Math.round(totalDays * i / Math.max(1, nTicks - 1)));
    text(svg, X(d), H - 6, shortDate(d), 'axis', i === 0 ? 'start' : i === nTicks - 1 ? 'end' : 'middle');
  }
  el('line', { x1: m.l, x2: m.l + iw, y1: m.t + ih, y2: m.t + ih, class: 'baseline' }, svg);

  // meta: en tu camino es una bandera al final de la línea; si no, una raya
  if (journey) {
    // nada aquí: la bandera se dibuja encima de todo, más abajo
  } else if (goalIn) {
    el('line', { x1: m.l, x2: m.l + iw, y1: Y(goalKg), y2: Y(goalKg), class: 'goal' }, svg);
    text(svg, m.l + iw + 6, Y(goalKg) + 4, `Meta ${kg1(goalKg)}`, 'goal-label');
  } else if (goalKg < lo) {
    // meta fuera del gráfico: se dice en el margen, sin tapar datos ni el último valor
    const endNearBottom = Y(lastTrend) > m.t + ih - 40;
    const gy = endNearBottom ? m.t + 10 : m.t + ih - 16;
    text(svg, m.l + iw + 6, gy, 'Meta', 'goal-label');
    text(svg, m.l + iw + 6, gy + 14, `${kg1(goalKg)} ↓`, 'goal-label');
  }

  // el carril de tu plan: ±PLAN_LANE kg alrededor de la recta
  if (laneOn) {
    const pts = [laneFrom];
    const kink = planKinkDate(plan, rateKgWeek, goalKg);
    if (kink && kink > laneFrom && kink < endDate) pts.push(kink);
    pts.push(endDate);
    const up = pts.map(d => `${X(d).toFixed(1)},${Y(planAt(d) + PLAN_LANE).toFixed(1)}`);
    const down = pts.slice().reverse().map(d => `${X(d).toFixed(1)},${Y(planAt(d) - PLAN_LANE).toFixed(1)}`);
    el('polygon', { points: [...up, ...down].join(' '), class: 'lane' }, svg);
    el('polyline', { points: pts.map(d => `${X(d).toFixed(1)},${Y(planAt(d)).toFixed(1)}`).join(' '), class: 'plan-line' }, svg);
  }

  // hoy, cuando el gráfico mira hacia delante
  const todayIso = opts.today;
  if (journey && todayIso && todayIso > vis[0].date && todayIso < endDate) {
    const tx = X(todayIso);
    el('line', { x1: tx, x2: tx, y1: m.t, y2: m.t + ih, class: 'today-line' }, svg);
    text(svg, tx, m.t - 3, 'hoy', 'today-label', 'middle');
  }

  // pesadas del día
  const measured = vis.filter(d => d.kg != null);
  const r = measured.length <= 45 ? 3.5 : 2.5;
  measured.forEach(d => el('circle', { cx: X(d.date), cy: Y(d.kg), r, class: 'dot' }, svg));

  // tendencia
  const path = vis.map((d, i) => `${i ? 'L' : 'M'}${X(d.date).toFixed(1)},${Y(d.trend).toFixed(1)}`).join('');
  el('path', { d: path, class: 'trend' }, svg);

  // proyección al ritmo actual
  if (projecting) {
    el('path', { d: `M${X(lastDate)},${Y(lastTrend)}L${X(endDate)},${Y(projEnd)}`, class: 'projection' }, svg);
  }

  // objetivos intermedios: un rombo en su fecha y su peso
  msIn.forEach(mm => {
    const x = X(mm.date), y = Y(mm.kg), k = 6;
    el('path', { d: `M${x},${y - k}L${x + k},${y}L${x},${y + k}L${x - k},${y}Z`, class: `ms ms-${mm.status}` }, svg);
    const lx = Math.min(Math.max(x, m.l + 24), m.l + iw - 4);
    text(svg, lx, y - k - 5, mm.name || `${kg1(mm.kg)} kg`, 'ms-label', 'middle');
  });

  // la bandera de la meta, al final de tu camino
  if (journey && goalDate <= endDate) {
    const fx = X(goalDate), fy = Y(goalKg);
    el('circle', { cx: fx, cy: fy, r: 5.5, class: 'flag' }, svg);
    // la etiqueta, debajo de la bandera (ahí no pasa la línea); si no cabe, encima
    const below = fy + 20 < m.t + ih;
    text(svg, fx, below ? fy + 19 : fy - 10, `Meta ${kg1(goalKg)}`, 'flag-label', 'end');
  }

  // último valor
  const ex = X(lastDate), ey = Y(lastTrend);
  el('circle', { cx: ex, cy: ey, r: 4.5, class: 'end-dot' }, svg);
  if (projecting) text(svg, ex, ey - 10, kg1(lastTrend), 'end-label', 'middle');
  else text(svg, ex + 8, ey + 4, kg1(lastTrend), 'end-label');

  // cursor al tocar
  const cursor = el('g', { class: 'cursor', visibility: 'hidden' }, svg);
  const cl = el('line', { y1: m.t, y2: m.t + ih, class: 'crosshair' }, cursor);
  const cd = el('circle', { r: 4.5, class: 'end-dot' }, cursor);
  const hit = el('rect', { x: m.l, y: 0, width: iw, height: H, class: 'hit', tabindex: 0 }, svg);
  hit.setAttribute('aria-label', 'Recorre los días con las flechas');
  const tip = tooltip(container);
  tip.hidden = true;
  let idx = vis.length - 1;

  const show = i => {
    idx = Math.max(0, Math.min(vis.length - 1, i));
    const d = vis[idx];
    const x = X(d.date), y = Y(d.trend);
    cl.setAttribute('x1', x); cl.setAttribute('x2', x);
    cd.setAttribute('cx', x); cd.setAttribute('cy', y);
    cursor.setAttribute('visibility', 'visible');
    const pl = laneOn ? planAt(d.date) : null;
    showTip(container, tip, [
      ['tip-value', d.kg != null ? `${kg1(d.kg)} kg` : 'Sin pesar'],
      ['tip-sub', `Tendencia ${kg1(d.trend)} kg`],
      ...(pl != null ? [['tip-sub', `Plan ${kg1(pl)} kg`]] : []),
      ['tip-date', longDate(d.date)],
    ], x, Math.min(y, d.kg != null ? Y(d.kg) : y));
  };
  const hide = () => { cursor.setAttribute('visibility', 'hidden'); tip.hidden = true; };
  const nearest = evt => {
    const rect = svg.getBoundingClientRect();
    const px = (evt.clientX - rect.left) * (W / rect.width);
    const dayOffset = Math.round((px - m.l) / iw * totalDays);
    return Math.max(0, Math.min(vis.length - 1, dayOffset));
  };
  hit.addEventListener('pointermove', e => show(nearest(e)));
  hit.addEventListener('pointerdown', e => show(nearest(e)));
  hit.addEventListener('pointerleave', hide);
  hit.addEventListener('blur', hide);
  hit.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { show(idx - 1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { show(idx + 1); e.preventDefault(); }
    else if (e.key === 'Escape') hide();
  });
  hit.addEventListener('focus', () => show(idx));

  if (!compact || journey) {
    const legend = document.createElement('div');
    legend.className = 'legend';
    [['key-dot', 'Peso del día'], ['key-line', 'Tendencia'],
      ...(laneOn ? [['key-plan', 'Línea a seguir']] : []),
      ...(msIn.length ? [['key-ms', 'Objetivo']] : []),
      ...(journey ? [] : [['key-dash', 'Meta']]),
      ...(projecting ? [['key-proj', 'A este ritmo']] : [])].forEach(([k, label]) => {
      const s = document.createElement('span');
      const sw = document.createElement('i');
      sw.className = k;
      s.append(sw, document.createTextNode(label));
      legend.appendChild(s);
    });
    container.appendChild(legend);
  }
}

/* ── ritmo semana a semana ──────────────────────────────────────────── */

export function rateChart(container, weekly) {
  container.replaceChildren();
  container.classList.add('chart');
  if (!weekly?.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Hace falta algo más de una semana de pesadas para ver el ritmo semanal.';
    container.appendChild(p);
    return;
  }
  const W = Math.max(280, container.clientWidth), H = 180;
  const m = { l: 34, r: 12, t: 16, b: 24 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const vals = weekly.map(w => w.change);
  let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
  lo = Math.min(lo, -0.5); hi = Math.max(hi, 0.5);
  const step = niceStep(hi - lo, 4);
  lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  const Y = v => m.t + (hi - v) / (hi - lo) * ih;
  const band = iw / weekly.length;
  const bw = Math.min(24, band * 0.6);

  const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Cambio de la tendencia cada semana' }, container);
  for (let v = lo; v <= hi + 1e-9; v += step) {
    el('line', { x1: m.l, x2: m.l + iw, y1: Y(v), y2: Y(v), class: Math.abs(v) < 1e-9 ? 'baseline' : 'grid' }, svg);
    text(svg, m.l - 6, Y(v) + 4, signed1(v), 'axis', 'end');
  }

  const tip = tooltip(container);
  tip.hidden = true;
  const y0 = Y(0);
  weekly.forEach((w, i) => {
    const x = m.l + band * i + (band - bw) / 2;
    const y1 = Y(w.change);
    const h = Math.abs(y1 - y0);
    const rr = Math.min(4, bw / 2, h);
    const up = y1 < y0;
    const tipY = up ? y1 : y0;
    const d = h < 0.5 ? '' : up
      ? `M${x},${y0}V${y1 + rr}Q${x},${y1} ${x + rr},${y1}H${x + bw - rr}Q${x + bw},${y1} ${x + bw},${y1 + rr}V${y0}Z`
      : `M${x},${y0}V${y1 - rr}Q${x},${y1} ${x + rr},${y1}H${x + bw - rr}Q${x + bw},${y1} ${x + bw},${y1 - rr}V${y0}Z`;
    if (d) el('path', { d, class: w.change < 0 ? 'bar-down' : 'bar-up' }, svg);
    if (i === weekly.length - 1) {
      text(svg, x + bw / 2, up ? y1 - 5 : y1 + 13, signed1(w.change), 'end-label', 'middle');
    }
    if (weekly.length <= 6 || (weekly.length - 1 - i) % 2 === 0) {
      text(svg, x + bw / 2, H - 6, shortDate(w.end), 'axis', 'middle');
    }
    const hit = el('rect', { x: m.l + band * i, y: m.t, width: band, height: ih, class: 'hit', tabindex: 0 }, svg);
    const label = `${signed1(w.change)} kg`;
    const sub = `Semana del ${shortDate(w.start)} al ${shortDate(w.end)}`;
    const on = () => showTip(container, tip, [['tip-value', label], ['tip-sub', w.change < 0 ? 'Bajada de la tendencia' : 'Subida de la tendencia'], ['tip-date', sub]], x + bw / 2, tipY);
    hit.addEventListener('pointerenter', on);
    hit.addEventListener('pointerdown', on);
    hit.addEventListener('focus', on);
    hit.addEventListener('pointerleave', () => { tip.hidden = true; });
    hit.addEventListener('blur', () => { tip.hidden = true; });
  });

  const legend = document.createElement('div');
  legend.className = 'legend';
  [['key-bar-down', 'Bajada'], ['key-bar-up', 'Subida']].forEach(([k, label]) => {
    const s = document.createElement('span');
    const sw = document.createElement('i');
    sw.className = k;
    s.append(sw, document.createTextNode(label));
    legend.appendChild(s);
  });
  container.appendChild(legend);
}

/* ── calorías por día ───────────────────────────────────────────────── */

let intFmt;
try { intFmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' }); }
catch { intFmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }); }

/* opts: food (por día), target (kcal), today, days (cuántos, 14 por defecto) */
export function kcalChart(container, { food, target, today, days = 14 }) {
  container.replaceChildren();
  container.classList.add('chart');
  const dates = Array.from({ length: days }, (_, i) => addDays(today, i - days + 1));
  const vals = dates.map(d => (food?.[d] || []).reduce((a, e) => a + (e.kcal || 0), 0));
  if (!vals.some(v => v > 0)) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Aún no has apuntado comidas. Hazlo en la pestaña Comidas y aquí verás cada día frente a tu objetivo.';
    container.appendChild(p);
    return;
  }
  const W = Math.max(280, container.clientWidth), H = 190;
  const m = { l: 40, r: 12, t: 18, b: 24 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  let hi = Math.max(target ? target * 1.25 : 0, ...vals) * 1.05;
  const step = niceStep(hi, 3) >= 100 ? niceStep(hi, 3) : 500;
  const nice = [250, 500, 1000, 1500, 2000].find(x => x >= hi / 3) || 2500;
  hi = Math.ceil(hi / nice) * nice;
  const Y = v => m.t + (1 - v / hi) * ih;
  const band = iw / days;
  const bw = Math.min(24, band * 0.62);
  const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Calorías de cada día frente a tu objetivo' }, container);
  for (let v = 0; v <= hi + 1e-9; v += nice) {
    el('line', { x1: m.l, x2: m.l + iw, y1: Y(v), y2: Y(v), class: v === 0 ? 'baseline' : 'grid' }, svg);
    text(svg, m.l - 6, Y(v) + 4, intFmt.format(v), 'axis', 'end');
  }
  const tip = tooltip(container);
  tip.hidden = true;
  dates.forEach((d, i) => {
    const v = vals[i];
    const x = m.l + band * i + (band - bw) / 2;
    if (v > 0) {
      const y1 = Y(v), y0 = Y(0), rr = Math.min(4, bw / 2, y0 - y1);
      el('path', { d: `M${x},${y0}V${y1 + rr}Q${x},${y1} ${x + rr},${y1}H${x + bw - rr}Q${x + bw},${y1} ${x + bw},${y1 + rr}V${y0}Z`, class: target && v > target * 1.05 ? 'bar-over' : 'bar-ok' }, svg);
    }
    if (i % 2 === (days - 1) % 2) text(svg, x + bw / 2, H - 6, i === days - 1 ? 'hoy' : String(parseDate(d).getDate()), 'axis', 'middle');
    const hit = el('rect', { x: m.l + band * i, y: m.t, width: band, height: ih, class: 'hit', tabindex: 0 }, svg);
    const diff = target ? v - target : 0;
    const on = () => showTip(container, tip, [
      ['tip-value', v ? `${intFmt.format(v)} kcal` : 'Sin apuntar'],
      ...(v && target ? [['tip-sub', diff > 0 ? `${intFmt.format(diff)} por encima` : `${intFmt.format(-diff)} por debajo`]] : []),
      ['tip-date', longDate(d)],
    ], x + bw / 2, Y(Math.max(v, 0)));
    hit.addEventListener('pointerenter', on);
    hit.addEventListener('pointerdown', on);
    hit.addEventListener('focus', on);
    hit.addEventListener('pointerleave', () => { tip.hidden = true; });
    hit.addEventListener('blur', () => { tip.hidden = true; });
  });
  if (target) {
    el('line', { x1: m.l, x2: m.l + iw, y1: Y(target), y2: Y(target), class: 'target-line' }, svg);
    text(svg, m.l + iw, Y(target) - 5, `Objetivo ${intFmt.format(Math.round(target / 10) * 10)}`, 'goal-label', 'end');
  }
  const legend = document.createElement('div');
  legend.className = 'legend';
  [['key-bar-down', 'Dentro del objetivo'], ['key-bar-over', 'Por encima']].forEach(([k, label]) => {
    const sp = document.createElement('span');
    const sw = document.createElement('i');
    sw.className = k;
    sp.append(sw, document.createTextNode(label));
    legend.appendChild(sp);
  });
  container.appendChild(legend);
}
