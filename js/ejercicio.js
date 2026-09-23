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
