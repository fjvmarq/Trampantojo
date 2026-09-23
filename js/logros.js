/* Trampantojo — logros, agua y tu semana.

   Los logros se CALCULAN a partir de tus datos (no se «desbloquean» a mano):
   si borras una pesada que lo sostenía, el logro no se inventa. La fecha en
   que se consiguió sí se guarda, para poder felicitarte una sola vez. */

import { addDays, daysBetween, bmiZone, bmi, dayKcal } from './calc.js?v=0.12.0';
import { qualityMix } from './calidad.js?v=0.12.0';
import { bestWeekMinutes } from './ejercicio.js?v=0.12.0';

/* ── agua ───────────────────────────────────────────────────────────── */

// Lo que conviene BEBER (la EFSA da 2,5 / 2,0 L en total; ~80 % se bebe).
export const GLASS_ML = 250;
export function waterGoal(sex) { return sex === 'h' ? 8 : 7; }   // vasos de 250 ml

/* ── la racha más larga ─────────────────────────────────────────────── */

export function longestStreak(dates) {
  const set = [...new Set(dates)].sort();
  let best = 0, run = 0, prev = null;
  for (const d of set) {
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/* ── los logros ─────────────────────────────────────────────────────── */

export const BADGES = [
  { id: 'primer-paso', glyph: '1', title: 'Primer paso', desc: 'Apuntaste tu primer peso.', test: c => c.entries >= 1 },
  { id: 'semana', glyph: '7', title: 'Una semana', desc: 'Siete días seguidos pesándote.', test: c => c.streakMax >= 7 },
  { id: 'mes', glyph: '30', title: 'Un mes de constancia', desc: 'Treinta días seguidos pesándote.', test: c => c.streakMax >= 30 },
  { id: 'kilo', glyph: '−1', title: 'El primer kilo', desc: 'Tu tendencia ha bajado un kilo.', test: c => c.lost >= 1 },
  { id: 'cinco-kilos', glyph: '−5', title: 'Cinco kilos', desc: 'Cinco kilos menos de tendencia.', test: c => c.lost >= 5 },
  { id: 'diez-kilos', glyph: '−10', title: 'Diez kilos', desc: 'Diez kilos menos. Enorme.', test: c => c.lost >= 10 },
  { id: '5pc', glyph: '5%', title: 'El 5 %', desc: 'Has perdido el 5 % de tu peso: tu tensión y tu azúcar ya lo notan.', test: c => c.lostPct >= 5 },
  { id: '10pc', glyph: '10%', title: 'El 10 %', desc: 'El 10 % de tu peso. Tu corazón te lo agradece.', test: c => c.lostPct >= 10 },
  { id: 'zona', glyph: '↓', title: 'Nueva zona', desc: 'Tu IMC ha pasado a una zona mejor.', test: c => c.betterZone },
  { id: 'antojo', glyph: '≈', title: 'Primera ola', desc: 'Venciste tu primer antojo.', test: c => c.beaten >= 1 },
  { id: 'surfista', glyph: '10', title: 'Surfista', desc: 'Diez antojos vencidos.', test: c => c.beaten >= 10 },
  { id: 'comidas7', glyph: '✎', title: 'Diario de comidas', desc: 'Siete días con las comidas apuntadas.', test: c => c.foodDays >= 7 },
  { id: 'plato', glyph: '★', title: 'Tu primer plato', desc: 'Guardaste un plato para apuntarlo de un toque.', test: c => c.dishes >= 1 },
  { id: 'agua7', glyph: 'H₂O', title: 'Bien hidratado', desc: 'Siete días llegando a tu agua.', test: c => c.waterDays >= 7 },
  { id: 'entreno', glyph: '↗', title: 'En marcha', desc: 'Apuntaste tu primer ejercicio.', test: c => c.exerciseDays >= 1 },
  { id: 'oms150', glyph: '150', title: 'Lo que pide la OMS', desc: 'Una semana con 150 minutos de ejercicio o más.', test: c => c.bestWeek >= 150 },
  { id: 'verde7', glyph: '●', title: 'Comida de verdad', desc: 'Siete días con al menos el 70 % de tus calorías de las buenas.', test: c => c.greenDays >= 7 },
  { id: 'objetivo', glyph: '◆', title: 'Objetivo cumplido', desc: 'Conseguiste un objetivo intermedio.', test: c => c.milestonesDone >= 1 },
  { id: 'meta', glyph: '✓', title: '¡Meta!', desc: 'Llegaste a tu peso objetivo.', test: c => c.goalReached },
];

// Los números de los que dependen los logros.
export function badgeContext(state, s) {
  const entries = state.weights || [];
  const cravings = state.cravings || [];
  const water = state.water || {};
  const goal = waterGoal(state.profile?.sex);
  const startZone = s.startKg && state.profile ? bmiZone(bmi(s.startKg, state.profile.heightCm)) : null;
  return {
    entries: entries.length,
    streakMax: longestStreak(entries.map(e => e.date)),
    lost: s.lostKg || 0,
    lostPct: s.lostPct || 0,
    betterZone: !!(startZone && s.bmiZone && s.bmiZone.max < startZone.max),
    beaten: cravings.filter(c => c.outcome === 'resistido' || c.outcome === 'alternativa').length,
    foodDays: Object.keys(state.food || {}).filter(d => dayKcal(state.food, d) >= 800).length,
    dishes: (state.dishes || []).length,
    waterDays: Object.values(water).filter(n => n >= goal).length,
    exerciseDays: Object.keys(state.exercise || {}).length,
    bestWeek: bestWeekMinutes(state.exercise),
    greenDays: Object.entries(state.food || {}).filter(([, list]) => {
      const m = qualityMix(list, state);
      return m.known >= 800 && m.pct.b >= 0.7;
    }).length,
    milestonesDone: (s.milestones || []).filter(m => m.status === 'conseguido').length,
    goalReached: !!(s.projection && s.projection.status === 'conseguido' && entries.length > 1),
  };
}

/* Qué logros tienes y cuáles son nuevos (para felicitarte una vez).
   Devuelve { earned: [{badge, date}], locked: [badge], fresh: [badge], stored } */
export function evaluateBadges(state, s, today) {
  const ctx = badgeContext(state, s);
  const stored = { ...(state.meta?.badges || {}) };
  const earned = [], locked = [], fresh = [];
  for (const b of BADGES) {
    if (b.test(ctx)) {
      if (!stored[b.id]) { stored[b.id] = today; fresh.push(b); }
      earned.push({ badge: b, date: stored[b.id] });
    } else locked.push(b);
  }
  return { earned, locked, fresh, stored };
}

/* ── tu semana ──────────────────────────────────────────────────────── */

// Los últimos 7 días frente a los 7 anteriores.
export function weekSummary(state, daily, today, sex) {
  const trendAt = new Map((daily || []).map(d => [d.date, d.trend]));
  const range = (end, n) => Array.from({ length: n }, (_, i) => addDays(end, -i));
  const cur = range(today, 7), prev = range(addDays(today, -7), 7);
  const stats = days => {
    const kcalDays = days.map(d => dayKcal(state.food, d)).filter(k => k >= 800);
    const mix = days.reduce((a, d) => {
      const m = qualityMix(state.food?.[d] || [], state);
      return { b: a.b + m.kcal.b, known: a.known + m.known };
    }, { b: 0, known: 0 });
    const water = days.map(d => state.water?.[d] || 0);
    const cr = (state.cravings || []).filter(c => days.includes(c.date));
    return {
      weighIns: (state.weights || []).filter(w => days.includes(w.date)).length,
      avgKcal: kcalDays.length ? kcalDays.reduce((a, b) => a + b, 0) / kcalDays.length : null,
      goodPct: mix.known >= 800 ? mix.b / mix.known : null,
      foodDays: kcalDays.length,
      avgWater: water.reduce((a, b) => a + b, 0) / days.length,
      cravings: cr.length,
      beaten: cr.filter(c => c.outcome === 'resistido' || c.outcome === 'alternativa').length,
      exMinutes: days.reduce((a, d) => a + (state.exercise?.[d] || []).reduce((b, e) => b + (e.minutes || 0), 0), 0),
    };
  };
  const endT = trendAt.get(today) ?? [...(daily || [])].reverse().find(d => d.date <= today)?.trend;
  const startT = trendAt.get(addDays(today, -7));
  return {
    change: endT != null && startT != null ? endT - startT : null,
    cur: stats(cur), prev: stats(prev),
    waterGoal: waterGoal(sex),
  };
}
