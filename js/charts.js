/* Trampantojo — los gráficos, en SVG y sin librerías.

   Colores y trazos salen de las variables CSS (--chart-trend, --chart-grid…), así que
   el modo oscuro no se toca aquí. Reglas: líneas de 2 px, rejilla fina y
   discreta, una etiqueta sólo donde importa (el último valor) y el resto
   en el recuadro que sale al tocar. */

import { addDays, daysBetween, parseDate } from './calc.js?v=0.1.0';

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
         rangeDays (null = todo), perWeek (para la proyección), compact */
export function weightChart(container, opts) {
  const { daily, goalKg, healthy, rangeDays, perWeek, compact } = opts;
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
  const from = rangeDays ? addDays(lastDate, -(rangeDays - 1)) : daily[0].date;
  const vis = daily.filter(d => d.date >= from);
  const span = Math.max(1, daysBetween(vis[0].date, lastDate));

  const lastTrend = vis[vis.length - 1].trend;
  const projecting = !compact && perWeek != null && perWeek < -0.05 && lastTrend - goalKg > 0.25;
  const future = projecting ? Math.max(7, Math.round(span * 0.25)) : 0;
  const endDate = addDays(lastDate, future);
  const projEnd = projecting ? Math.max(goalKg, lastTrend + perWeek / 7 * future) : null;

  // eje vertical: los datos mandan; la meta entra sólo si no aplasta la línea
  const vals = [];
  vis.forEach(d => { vals.push(d.trend); if (d.kg != null) vals.push(d.kg); });
  if (projEnd != null) vals.push(projEnd);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const dataSpan = Math.max(hi - lo, 1);
  const goalIn = goalKg >= lo - dataSpan * 0.8 && goalKg <= hi + dataSpan * 0.8;
  if (goalIn) { lo = Math.min(lo, goalKg); hi = Math.max(hi, goalKg); }
  const pad = Math.max(0.3, (hi - lo) * 0.08);
  lo -= pad; hi += pad;
  const step = niceStep(hi - lo, compact ? 3 : 4);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;

  const W = Math.max(280, container.clientWidth);
  const H = compact ? 170 : 240;
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

  // eje de fechas: 3–5 marcas repartidas
  const nTicks = Math.min(compact || W < 420 ? 3 : 5, span + 1);
  for (let i = 0; i < nTicks; i++) {
    const d = addDays(vis[0].date, Math.round(span * i / Math.max(1, nTicks - 1)));
    const x = X(d);
    text(svg, x, H - 6, shortDate(d), 'axis', i === 0 ? 'start' : i === nTicks - 1 && !future ? 'end' : 'middle');
  }
  el('line', { x1: m.l, x2: m.l + iw, y1: m.t + ih, y2: m.t + ih, class: 'baseline' }, svg);

  // meta
  if (goalIn) {
    el('line', { x1: m.l, x2: m.l + iw, y1: Y(goalKg), y2: Y(goalKg), class: 'goal' }, svg);
    text(svg, m.l + iw + 6, Y(goalKg) + 4, `Meta ${kg1(goalKg)}`, 'goal-label');
  } else if (goalKg < lo) {
    // meta fuera del gráfico: se dice en el margen, sin tapar datos ni el último valor
    const endNearBottom = Y(lastTrend) > m.t + ih - 40;
    const gy = endNearBottom ? m.t + 10 : m.t + ih - 16;
    text(svg, m.l + iw + 6, gy, 'Meta', 'goal-label');
    text(svg, m.l + iw + 6, gy + 14, `${kg1(goalKg)} ↓`, 'goal-label');
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
    showTip(container, tip, [
      ['tip-value', d.kg != null ? `${kg1(d.kg)} kg` : 'Sin pesar'],
      ['tip-sub', `Tendencia ${kg1(d.trend)} kg`],
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

  if (!compact) {
    const legend = document.createElement('div');
    legend.className = 'legend';
    [['key-dot', 'Peso del día'], ['key-line', 'Tendencia'], ['key-dash', 'Meta'],
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
