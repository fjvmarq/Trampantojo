/* Trampantojo — el ejercicio.

   Lo que quemas se estima con los MET del Compendio de Actividades Físicas:
   kcal ≈ (MET − 1) × kg × horas. Se resta 1 MET porque ese gasto (estar vivo)
   ya está contado en tu metabolismo basal. Es orientativo: por eso, por
   defecto, NO se suma a tus calorías del día (tu nivel de actividad ya cuenta
   el ejercicio habitual, y las estimaciones suelen pasarse). Se puede elegir
   sumar la mitad o todo en Perfil. */

export const ACTIVITIES = [
  { id: 'andar', label: 'Andar', met: 3.5 },
  { id: 'andar-rapido', label: 'Andar rápido', met: 4.8 },
  { id: 'correr', label: 'Correr', met: 9 },
  { id: 'bici', label: 'Bici', met: 7 },
  { id: 'padel', label: 'Pádel', met: 6 },
  { id: 'tenis', label: 'Tenis', met: 7.3 },
  { id: 'futbol', label: 'Fútbol', met: 7 },
  { id: 'nadar', label: 'Nadar', met: 6 },
  { id: 'gimnasio', label: 'Pesas / gimnasio', met: 5 },
  { id: 'clase', label: 'Spinning, zumba…', met: 7.5 },
  { id: 'yoga', label: 'Yoga o pilates', met: 3 },
  { id: 'bailar', label: 'Bailar', met: 5 },
  { id: 'casa', label: 'Limpieza o jardín', met: 3.5 },
];
export const ACT_BY_ID = new Map(ACTIVITIES.map(a => [a.id, a]));

export function burned(met, kg, minutes) {
  return Math.max(0, (met - 1) * (kg || 75) * minutes / 60);
}

// Cuánto se suma al objetivo del día según lo que elijas en Perfil.
export const EXERCISE_CREDIT = { nada: 0, mitad: 0.5, todo: 1 };

export function dayExercise(exercise, date) {
  const list = exercise?.[date] || [];
  return { list, kcal: list.reduce((a, e) => a + (e.kcal || 0), 0), minutes: list.reduce((a, e) => a + (e.minutes || 0), 0) };
}

// Minutos de la semana (los 7 últimos días). La OMS recomienda 150 de actividad moderada.
export const WHO_WEEKLY_MIN = 150;
export function weekMinutes(exercise, today, addDays) {
  let m = 0;
  for (let i = 0; i < 7; i++) m += dayExercise(exercise, addDays(today, -i)).minutes;
  return m;
}

// Un apunte: la actividad, los minutos y lo que se estima que gasta con tu peso.
export function exerciseEntry(actId, minutes, kg, now = Date.now()) {
  const a = ACT_BY_ID.get(actId);
  if (!a || !(minutes > 0)) return null;
  return {
    id: `e${now.toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    act: a.id, minutes: Math.round(minutes), kcal: Math.round(burned(a.met, kg, minutes)), t: now,
  };
}

// Las últimas n semanas de lunes a domingo, con sus minutos (la última es la actual).
export function weeksMinutes(exercise, today, addDays, n = 8) {
  const d = new Date(today + 'T12:00:00');
  const monday = addDays(today, -((d.getDay() + 6) % 7));
  const out = [];
  for (let w = n - 1; w >= 0; w--) {
    const start = addDays(monday, -7 * w);
    let minutes = 0, kcal = 0;
    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i);
      if (day > today) break;
      const x = dayExercise(exercise, day);
      minutes += x.minutes; kcal += x.kcal;
    }
    out.push({ start, minutes, kcal, current: w === 0 });
  }
  return out;
}

// La mejor semana de calendario (para el logro de los 150 minutos).
export function bestWeekMinutes(exercise) {
  const byWeek = new Map();
  for (const [day, list] of Object.entries(exercise || {})) {
    const d = new Date(day + 'T12:00:00');
    d.setDate(d.getDate() - (d.getDay() + 6) % 7);
    const key = d.toISOString().slice(0, 10);
    byWeek.set(key, (byWeek.get(key) || 0) + (list || []).reduce((a, e) => a + (e.minutes || 0), 0));
  }
  return Math.max(0, ...byWeek.values());
}
