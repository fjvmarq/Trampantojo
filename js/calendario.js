/* Trampantojo — el calendario de hábitos.

   Un mes a la vista y, en cada día, cuántas de estas cinco cosas hiciste:
   pesarte, llegar a tu agua, que al menos el 70 % de lo que comiste fueran
   calorías buenas, moverte 20 minutos o más, y vencer un antojo (si te dio
   alguno: un día sin antojos no suma ese punto, pero tampoco lo resta; el
   buen día es el de tres o más). Se calcula de tus datos: no hay que marcar
   nada. */

import { qualityMix } from './calidad.js?v=0.11.0';

export const HABITS = [
  { id: 'peso', label: 'Te pesaste' },
  { id: 'agua', label: 'Tu agua' },
  { id: 'verde', label: 'Calorías buenas' },
  { id: 'ejercicio', label: 'Te moviste' },
  { id: 'antojo', label: 'Antojos a raya' },
];

export function dayHabits(state, date, waterGoal) {
  const food = state.food?.[date] || [];
  const mix = qualityMix(food, state);
  const exMin = (state.exercise?.[date] || []).reduce((a, e) => a + (e.minutes || 0), 0);
  const cravings = (state.cravings || []).filter(c => c.date === date && c.outcome);
  return {
    peso: (state.weights || []).some(w => w.date === date),
    agua: (state.water?.[date] || 0) >= waterGoal,
    verde: mix.known >= 800 && mix.pct.b >= 0.7,
    ejercicio: exMin >= 20,
    // un antojo cuenta si lo venciste; si hubo alguno y todos ganaron ellos, no
    antojo: cravings.length > 0 && cravings.some(c => c.outcome === 'resistido' || c.outcome === 'alternativa'),
    detail: {
      water: state.water?.[date] || 0, goodPct: mix.known >= 300 ? mix.pct.b : null, kcal: mix.total,
      exMin, cravings: cravings.length, beaten: cravings.filter(c => c.outcome === 'resistido' || c.outcome === 'alternativa').length,
      kg: (state.weights || []).find(w => w.date === date)?.kg ?? null,
    },
  };
}

export function score(h) {
  return HABITS.reduce((a, x) => a + (h[x.id] ? 1 : 0), 0);
}

// Las semanas del mes (de lunes a domingo), con null en los huecos.
export function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells = Array(lead).fill(null);
  const p = n => String(n).padStart(2, '0');
  for (let d = 1; d <= days; d++) cells.push(`${year}-${p(month + 1)}-${p(d)}`);
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// El resumen del mes: días con 3 o más hábitos y la mejor racha de días así.
export function monthSummary(state, year, month, waterGoal, today) {
  const dates = monthGrid(year, month).flat().filter(d => d && d <= today);
  let good = 0, run = 0, best = 0;
  const counts = Object.fromEntries(HABITS.map(h => [h.id, 0]));
  for (const d of dates) {
    const h = dayHabits(state, d, waterGoal);
    HABITS.forEach(x => { if (h[x.id]) counts[x.id]++; });
    if (score(h) >= 3) { good++; run++; best = Math.max(best, run); } else run = 0;
  }
  return { days: dates.length, good, best, counts };
}
