/* Trampantojo — los cálculos de salud.
   Aquí no hay pantalla ni almacenamiento: sólo números. Así se pueden probar
   solos en tests.html, y un fallo de cálculo no se esconde detrás de la interfaz.

   Las fechas viajan como texto 'AAAA-MM-DD' en hora local. Nunca como Date:
   un Date a medianoche UTC cae en el día anterior en España y descuadra todo. */

export const KCAL_PER_KG = 7700;          // energía aproximada de 1 kg de grasa
export const TREND_ALPHA = 0.1;           // cuánto pesa el dato de hoy en la tendencia (10 %)
export const TREND_BETA = 0.05;           // cuánto se corrige la pendiente cada día
export const RATE_WINDOW_DAYS = 21;       // ventana para medir el ritmo real

export const ACTIVITY = {
  sedentario: { factor: 1.2,   label: 'Sedentaria',  hint: 'Trabajo sentado y casi sin ejercicio' },
  ligero:     { factor: 1.375, label: 'Ligera',      hint: 'Ejercicio suave 1–3 días por semana' },
  moderado:   { factor: 1.55,  label: 'Moderada',    hint: 'Ejercicio 3–5 días por semana' },
  activo:     { factor: 1.725, label: 'Alta',        hint: 'Ejercicio intenso 6–7 días por semana' },
  muyActivo:  { factor: 1.9,   label: 'Muy alta',    hint: 'Trabajo físico y además entreno diario' },
};

// Por debajo de esto no se come sin un médico delante. La app nunca propone menos.
export const KCAL_FLOOR = { h: 1500, m: 1200 };

// Agua total al día, bebida + la que trae la comida (EFSA).
export const WATER_L = { h: 2.5, m: 2.0 };

/* ── fechas ─────────────────────────────────────────────────────────── */

export function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function fmtISO(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function todayISO(now = new Date()) {
  return fmtISO(now);
}

// Math.round y no floor: el cambio de hora hace que un día dure 23 o 25 horas.
export function daysBetween(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

export function addDays(s, n) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return fmtISO(d);
}

export function ageOn(birth, on) {
  const b = parseDate(birth), o = parseDate(on);
  let age = o.getFullYear() - b.getFullYear();
  if (o.getMonth() < b.getMonth() || (o.getMonth() === b.getMonth() && o.getDate() < b.getDate())) age--;
  return age;
}

/* ── composición corporal ───────────────────────────────────────────── */

export function bmi(kg, cm) {
  const m = cm / 100;
  return kg / (m * m);
}

// Zonas de la OMS. `status` es la gravedad para pintar la etiqueta, no un juicio.
export const BMI_ZONES = [
  { max: 18.5,     key: 'bajo',      label: 'Bajo peso',          status: 'warning' },
  { max: 25,       key: 'normal',    label: 'Peso normal',        status: 'good' },
  { max: 30,       key: 'sobrepeso', label: 'Sobrepeso',          status: 'warning' },
  { max: 35,       key: 'ob1',       label: 'Obesidad grado I',   status: 'serious' },
  { max: 40,       key: 'ob2',       label: 'Obesidad grado II',  status: 'critical' },
  { max: Infinity, key: 'ob3',       label: 'Obesidad grado III', status: 'critical' },
];

export function bmiZone(value) {
  return BMI_ZONES.find(z => value < z.max);
}

export function kgForBmi(b, cm) {
  return b * (cm / 100) ** 2;
}

// Peso con el que el IMC queda entre 18,5 y 24,9 para esa altura.
export function healthyRange(cm) {
  return [kgForBmi(18.5, cm), kgForBmi(24.9, cm)];
}

// Índice cintura/altura: por debajo de 0,5 es la señal buena.
export function whtr(waistCm, heightCm) {
  return waistCm / heightCm;
}

export function whtrZone(v) {
  if (v < 0.5) return { label: 'Saludable', status: 'good' };
  if (v < 0.6) return { label: 'Riesgo aumentado', status: 'warning' };
  return { label: 'Riesgo alto', status: 'critical' };
}

// % de grasa por el método de la Marina de EE. UU. (cinta métrica, en cm).
// Hombre: cintura y cuello. Mujer: además la cadera.
export function navyBodyFat({ sex, cm, waist, neck, hip }) {
  if (!waist || !neck || !cm) return null;
  if (sex === 'h') {
    if (waist <= neck) return null;
    return 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(cm)) - 450;
  }
  if (!hip || waist + hip <= neck) return null;
  return 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(cm)) - 450;
}

// Categorías del American Council on Exercise.
export function bodyFatZone(sex, pct) {
  const t = sex === 'h' ? [6, 14, 18, 25] : [14, 21, 25, 32];
  if (pct < t[0]) return { label: 'Muy baja', status: 'warning' };
  if (pct < t[1]) return { label: 'Deportista', status: 'good' };
  if (pct < t[2]) return { label: 'En forma', status: 'good' };
  if (pct < t[3]) return { label: 'Media', status: 'warning' };
  return { label: 'Alta', status: 'serious' };
}

/* ── energía ────────────────────────────────────────────────────────── */

// Metabolismo basal, fórmula de Mifflin-St Jeor.
export function bmr({ sex, kg, cm, age }) {
  return 10 * kg + 6.25 * cm - 5 * age + (sex === 'h' ? 5 : -161);
}

export function tdee(bmrValue, activity) {
  return bmrValue * (ACTIVITY[activity]?.factor ?? ACTIVITY.sedentario.factor);
}

/* Calorías al día para bajar al ritmo pedido. Si el ritmo exigiría comer
   menos del mínimo, se queda en el mínimo y se dice cuál es el ritmo real. */
export function targetKcal({ tdee: gasto, rateKgWeek, sex, maintain = false }) {
  const floor = KCAL_FLOOR[sex] ?? KCAL_FLOOR.m;
  if (maintain) return { kcal: gasto, raw: gasto, floor, clipped: false, deficit: 0, effectiveRate: 0 };
  const raw = gasto - rateKgWeek * KCAL_PER_KG / 7;
  const kcal = Math.max(raw, floor);
  const deficit = Math.max(0, gasto - kcal);
  return { kcal, raw, floor, clipped: raw < floor, deficit, effectiveRate: deficit * 7 / KCAL_PER_KG };
}

// Proteína orientativa: 1,2–1,6 g por kilo de peso objetivo.
export function proteinRange(goalKg) {
  return [1.2 * goalKg, 1.6 * goalKg];
}

/* ── la tendencia ───────────────────────────────────────────────────── */

/* El peso de un día baila 1–2 kg por el agua. La tendencia es lo que queda
   cuando se quita ese baile: una media que cada día se acerca un 10 % al peso
   real Y que además sigue la pendiente (suavizado doble, de Holt). Sin la
   pendiente, una media sola va siempre por detrás: bajando medio kilo por
   semana se quedaba ~0,6 kg por encima de la báscula, y parecía que no
   bajabas. Los días sin pesarse se rellenan en línea recta entre las dos
   pesadas que los rodean, para que un hueco no dé un tirón a la línea. */
export function dailySeries(entries) {
  if (!entries.length) return [];
  const out = [];
  let level = entries[0].kg, slope = 0;
  out.push({ date: entries[0].date, kg: entries[0].kg, trend: level, measured: true });
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1], cur = entries[i];
    const gap = daysBetween(prev.date, cur.date);
    for (let k = 1; k <= gap; k++) {
      const v = prev.kg + (cur.kg - prev.kg) * k / gap;
      const prevLevel = level;
      level = TREND_ALPHA * v + (1 - TREND_ALPHA) * (level + slope);
      slope = TREND_BETA * (level - prevLevel) + (1 - TREND_BETA) * slope;
      const measured = k === gap;
      out.push({ date: addDays(prev.date, k), kg: measured ? cur.kg : null, trend: level, measured });
    }
  }
  return out;
}

// Ritmo real: recta de mínimos cuadrados sobre las pesadas de las últimas semanas.
export function rateKgPerWeek(entries, endDate, windowDays = RATE_WINDOW_DAYS) {
  const start = addDays(endDate, -windowDays);
  const pts = entries.filter(e => e.date > start && e.date <= endDate);
  if (pts.length < 4) return null;
  const span = daysBetween(pts[0].date, pts[pts.length - 1].date);
  if (span < 7) return null;
  const xs = pts.map(p => daysBetween(start, p.date));
  const ys = pts.map(p => p.kg);
  const n = pts.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  return { perWeek: num / den * 7, n, span };
}

// ¿Cuándo se llega a la meta al ritmo actual?
export function projectGoal({ trendKg, goalKg, perWeek, fromDate }) {
  const remaining = trendKg - goalKg;
  if (remaining <= 0.25) return { status: 'conseguido' };
  if (perWeek == null) return { status: 'sin-datos' };
  if (perWeek > -0.05) return { status: 'estancado' };
  const days = Math.round(remaining / -perWeek * 7);
  if (days > 730) return { status: 'lejos', days };
  return { status: 'ok', days, date: addDays(fromDate, days) };
}

// Cambio de la tendencia semana a semana, las últimas `weeks` semanas completas.
export function weeklyChanges(daily, weeks = 12) {
  if (daily.length < 8) return [];
  const byDate = new Map(daily.map(d => [d.date, d.trend]));
  const last = daily[daily.length - 1].date;
  const first = daily[0].date;
  const out = [];
  for (let w = 0; w < weeks; w++) {
    const end = addDays(last, -7 * w);
    const start = addDays(end, -7);
    if (start < first) break;
    out.unshift({ start: addDays(start, 1), end, change: byDate.get(end) - byDate.get(start) });
  }
  return out;
}

// Días seguidos pesándose, contando hasta hoy (o hasta ayer, si hoy aún no toca).
export function streak(entries, today) {
  const dates = new Set(entries.map(e => e.date));
  let d = dates.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (dates.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

// Sugerencia de actividad a partir de los hábitos que cuenta el usuario.
export function suggestActivity(habits) {
  if (!habits) return null;
  const days = Number(habits.exerciseDays) || 0;
  const minutes = Number(habits.exerciseMinutes) || 0;
  let score = 0;
  if (days >= 6 && minutes >= 45) score = 3;
  else if (days >= 3 && minutes >= 30) score = 2;
  else if (days >= 1) score = 1;
  if (habits.work === 'movimiento') score += 1;
  if (habits.steps === 'mas12') score += 1;
  else if (habits.steps === '8a12' && score < 2) score += 1;
  const keys = ['sedentario', 'ligero', 'moderado', 'activo', 'muyActivo'];
  return keys[Math.min(score, 4)];
}

/* ── tu plan y tus objetivos ────────────────────────────────────────── */

/* El plan es la recta que baja desde donde empezaste, al ritmo que elegiste,
   hasta la meta (y ahí se queda). Si tu tendencia va por debajo, vas por
   delante; por encima, vas por detrás. El carril es ±PLAN_LANE kg: la
   tendencia todavía se mueve unas décimas, y eso no es ni ir bien ni mal. */
export const PLAN_LANE = 0.5;

export function planKgAt(plan, rateKgWeek, goalKg, date) {
  if (!plan) return null;
  const d = daysBetween(plan.startDate, date);
  if (d < 0) return null;
  return Math.max(goalKg, plan.startKg - rateKgWeek / 7 * d);
}

// Día en que el plan pasa por `kg` (o null si el plan nunca llega ahí).
export function planDateForKg(plan, rateKgWeek, kg) {
  if (!plan) return null;
  if (kg >= plan.startKg) return plan.startDate;
  if (!(rateKgWeek > 0)) return null;
  return addDays(plan.startDate, Math.ceil((plan.startKg - kg) / (rateKgWeek / 7)));
}

export function paceStatus(trendKg, planKg) {
  if (planKg == null) return null;
  const diff = trendKg - planKg;            // + = por encima del plan (detrás)
  if (diff <= -PLAN_LANE) return { status: 'ahead', diff };
  if (diff >= PLAN_LANE) return { status: 'behind', diff };
  return { status: 'on', diff };
}

/* Un objetivo intermedio: un peso para una fecha («88 kg para Navidad»).
   Conseguido = la tendencia bajó hasta él en algún momento antes de la fecha.
   Si la fecha aún no ha llegado, se mira a dónde llegarás a tu ritmo real. */
export function milestoneStatus(m, s) {
  const reachedOn = (s.daily || []).find(d => d.date <= m.date && d.trend <= m.kg + 0.05)?.date;
  if (reachedOn) return { status: 'conseguido', reachedOn };
  if (m.date <= s.today) {
    const at = (s.daily || []).find(d => d.date === m.date)?.trend ?? s.trendKg;
    return { status: 'pasado', short: at - m.kg };
  }
  const days = daysBetween(s.today, m.date);
  const left = s.trendKg - m.kg;
  const needed = left / days * 7;           // kg por semana que hacen falta
  if (!s.rate) return { status: 'sin-datos', days, left, needed };
  const projected = s.trendKg + s.rate.perWeek / 7 * days;
  return { status: projected <= m.kg + 0.05 ? 'en-camino' : 'detras', days, left, needed, projected };
}

/* ── el resumen que pinta la pantalla ───────────────────────────────── */

export function summarize(state, today = todayISO()) {
  const { profile, weights } = state;
  const entries = [...weights].sort((a, b) => a.date < b.date ? -1 : 1);
  const s = { today, entries, hasData: entries.length > 0 };
  if (!profile) return s;

  s.age = ageOn(profile.birthDate, today);
  s.healthy = healthyRange(profile.heightCm);
  s.protein = proteinRange(profile.goalKg);
  s.waterL = WATER_L[profile.sex] ?? WATER_L.m;
  if (!entries.length) return s;

  const daily = dailySeries(entries);
  const last = daily[daily.length - 1];
  s.daily = daily;
  s.latest = entries[entries.length - 1];
  s.trendKg = last.trend;
  s.startKg = entries[0].kg;
  s.startDate = entries[0].date;
  s.lostKg = s.startKg - s.trendKg;
  s.lostPct = s.lostKg / s.startKg * 100;
  s.daysTracked = daysBetween(entries[0].date, today) + 1;
  s.weighedToday = s.latest.date === today;
  s.streak = streak(entries, today);

  s.bmi = bmi(s.trendKg, profile.heightCm);
  s.bmiZone = bmiZone(s.bmi);
  s.startBmiZone = bmiZone(bmi(s.startKg, profile.heightCm));

  const b = bmr({ sex: profile.sex, kg: s.trendKg, cm: profile.heightCm, age: s.age });
  s.bmr = b;
  s.tdee = tdee(b, profile.activity);
  s.maintain = s.trendKg - profile.goalKg <= 0.25;
  s.target = targetKcal({ tdee: s.tdee, rateKgWeek: profile.rateKgWeek, sex: profile.sex, maintain: s.maintain });

  s.rate = rateKgPerWeek(entries, last.date);
  s.plan = profile.plan || { startDate: entries[0].date, startKg: entries[0].kg };
  s.planKgToday = planKgAt(s.plan, profile.rateKgWeek, profile.goalKg, today);
  s.planEnd = planDateForKg(s.plan, profile.rateKgWeek, profile.goalKg);
  s.pace = s.maintain ? null : paceStatus(s.trendKg, s.planKgToday);
  s.projection = projectGoal({ trendKg: s.trendKg, goalKg: profile.goalKg, perWeek: s.rate?.perWeek ?? null, fromDate: today });
  s.weekly = weeklyChanges(daily);
  s.milestones = [...(state.milestones || [])]
    .sort((x, y) => x.date < y.date ? -1 : 1)
    .map(m => ({ ...m, ...milestoneStatus(m, s) }));
  s.nextMilestone = s.milestones.find(m => m.status !== 'conseguido' && m.date > today) || null;

  // medidas: la última de cada una
  const lastWith = key => [...entries].reverse().find(e => e[key] > 0)?.[key];
  const waist = lastWith('waist'), neck = lastWith('neck'), hip = lastWith('hip');
  if (waist) {
    s.waist = waist;
    s.whtr = whtr(waist, profile.heightCm);
    s.whtrZone = whtrZone(s.whtr);
    const bf = navyBodyFat({ sex: profile.sex, cm: profile.heightCm, waist, neck, hip });
    if (bf != null && bf > 2 && bf < 70) {
      s.bodyFat = bf;
      s.bodyFatZone = bodyFatZone(profile.sex, bf);
    }
  }
  return s;
}
