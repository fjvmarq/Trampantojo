/* Trampantojo — «Tengo un antojo».

   Un antojo es una ola: sube, llega arriba y baja sola en 10–20 minutos si no
   se le da de comer. Esta pantalla está para pasar ese rato con la cabeza fría:
   1. qué te apetece, 2. tres preguntas (hambre, cómo estás, sueño),
   3. POR QUÉ te pasa — con lo que llevas comido hoy si lo has apuntado, y si
      no, por lo psicológico —, lo que te cuesta y tus propias razones,
   4. tres salidas: esperar 10 minutos, una alternativa sana, o comértelo con
      cabeza (una ración pequeña, apuntada, sin culpa).
   Y antes que nada, lo más importante de ver: el ejercicio que hace
   falta para quemarlo, qué TIPO de calorías son (y dónde se notan en el
   cuerpo), y un cambio con las MISMAS calorías pero buenas. Las calorías solas
   no dicen si algo te alimenta: el tipo sí.
   Cada antojo se guarda con cómo acabó: con eso sale tu hora peligrosa.

   Tono: de apoyo, nunca de culpa. Prohibir del todo suele acabar en atracón;
   decidir tú, no. Las explicaciones son de divulgación general, no médicas. */

import { FOODS_BY_ID, nutrientsFor } from './foods.js?v=0.10.1';
import { foodQuality, TYPES } from './calidad.js?v=0.10.1';
import { ACT_BY_ID, burned } from './ejercicio.js?v=0.10.1';

/* ── lo que te apetece: una ración típica para ponerle precio ──────── */
// made: de qué está hecho, para entender qué te llevas a la boca.
// swap: lo mismo en calorías, pero de las buenas (el test comprueba que
// cuadra con ±20 %): la cantidad no dice si algo te alimenta, el tipo sí.
export const CRAVINGS = [
  { id: 'dulce', label: 'Algo dulce', food: ['gominolas', 'puñado', 1], kind: 'dulce',
    made: 'Casi un 80 % es azúcar y jarabe de glucosa; el resto, gelatina, colorantes y aromas.',
    swap: { label: 'Un plátano', items: [['platano', 'pieza', 1]],
      why: 'El mismo dulzor y las mismas calorías, pero el azúcar viene dentro de la fruta, con fibra que lo frena, potasio y vitaminas.' } },
  { id: 'chocolate', label: 'Chocolate', food: ['chocolate-leche', 'onza', 4], kind: 'dulce',
    made: 'Cerca de la mitad es azúcar; el resto, manteca de cacao, leche en polvo y sólo un 25–35 % de cacao.',
    swap: { label: 'Skyr con fresas y una onza de chocolate negro rallada', items: [['skyr', 'unidad', 1], ['fresas', 'ración', 1], ['chocolate-negro', 'onza', 1]],
      why: 'Sigue sabiendo a chocolate —negro, con más cacao y menos azúcar—, y el skyr te da proteína de verdad, que es lo que sacia.' } },
  { id: 'bolleria', label: 'Bollería o galletas', food: ['napolitana', 'unidad', 1], kind: 'dulce',
    made: 'Harina blanca, azúcar y mucha grasa —mantequilla o, en la industrial, aceite de palma—, con relleno de crema de cacao.',
    swap: { label: 'Dos tostadas integrales con aguacate, tomate y un huevo', items: [['pan-integral', 'rebanada', 2], ['aguacate', 'medio', 1], ['tomate', 'unidad', 1], ['huevo', 'unidad', 1]],
      why: 'Las mismas calorías, pero con cereal integral, la grasa buena del aguacate y la proteína del huevo: te llevan hasta la comida sin pedir más.' } },
  { id: 'helado', label: 'Helado', food: ['helado', 'tarrina', 1], kind: 'dulce',
    made: 'Leche, nata y unos 25 g de azúcar por tarrina, con aire batido para que abulte.',
    swap: { label: 'Yogur griego con arándanos y unas nueces', items: [['yogur-griego', 'unidad', 1], ['arandanos', 'ración', 1], ['nueces', 'puñado', 0.25]],
      why: 'Frío, cremoso y dulce igual, pero con fruta, la grasa buena de las nueces y sin azúcar añadido.' } },
  { id: 'salado', label: 'Patatas o salado', food: ['patatas-bolsa', 'bolsa pequeña', 1], kind: 'salado',
    made: 'Patata en láminas frita en aceite de girasol y con mucha sal: un tercio de la bolsa es aceite.',
    swap: { label: 'Un puñado de almendras tostadas y unos tomates cherry', items: [['almendras', 'puñado', 1], ['tomate', 'unidad', 1]],
      why: 'El mismo crujiente, pero la grasa es buena y trae fibra y proteína: con un puñado basta, y la bolsa no.' } },
  { id: 'rapida', label: 'Pizza o hamburguesa', food: ['pizza', 'porción', 2], kind: 'salado',
    made: 'Masa de harina blanca, queso fundido, embutido y sal: dos porciones pasan de 2 g de sal, cerca de la mitad de lo recomendado para todo el día.',
    swap: { label: 'Un bocadillo integral de pollo con tomate y lechuga', items: [['pan-integral', 'media barra', 1], ['pollo-plancha', 'ración', 1], ['tomate', 'unidad', 1], ['lechuga', 'plato', 1]],
      why: 'Las mismas calorías, con pan integral y mucha más proteína: te llena igual y no te deja pesado.' } },
  { id: 'embutido', label: 'Chorizo o embutido', food: ['chorizo', 'ración', 1], kind: 'salado',
    made: 'Carne y grasa de cerdo picadas, sal, pimentón y conservantes (nitritos), curado: tres cuartas partes de sus calorías son grasa, mucha de ella saturada.',
    swap: { label: 'Atún al natural con tomate, aceitunas y una tostada integral', items: [['atun-natural', 'lata', 1], ['tomate', 'unidad', 1], ['aceitunas', 'unidad', 6], ['pan-integral', 'rebanada', 1], ['aceite', 'cucharadita', 1]],
      why: 'Proteína de sobra y la grasa buena del aceite y las aceitunas, en vez de grasa saturada, sal y nitritos.' } },
  { id: 'refresco', label: 'Un refresco', food: ['refresco', 'lata', 1], kind: 'bebida',
    made: 'Agua con gas y unos 35 g de azúcar por lata —siete terrones—, disueltos para que entren sin que los notes.',
    swap: { label: 'Una naranja y una mandarina (y agua con gas con limón)', items: [['naranja', 'pieza', 1], ['mandarina', 'pieza', 1]],
      why: 'Más o menos el mismo azúcar, pero dentro de la fruta: con fibra que lo frena, vitamina C, y masticando, que sacia. Para la burbuja, agua con gas y limón.' } },
  { id: 'alcohol', label: 'Una cerveza o una copa', food: ['cerveza', 'caña', 2], kind: 'alcohol',
    made: 'Agua, alcohol y un poco de hidrato de la cebada: dos terceras partes de sus calorías son del propio alcohol.',
    swap: { label: 'Una cerveza sin alcohol y una ración de boquerones en vinagre', items: [['cerveza-sin', 'caña', 1], ['boquerones', 'ración', 1]],
      why: 'La caña fría y la tapa, con las mismas calorías: el boquerón trae proteína y omega-3, y tu hígado no tiene que hacer horas extra.' } },
  { id: 'picar', label: 'Picar lo que sea', food: ['frutos-secos', 'puñado', 1.5], kind: 'picar',
    made: 'Almendras, cacahuetes, nueces…: grasa buena, fibra y proteína. Son calorías de calidad; el problema es sólo la cantidad, porque se comen a puñados sin darte cuenta.',
    swap: { label: 'Medio puñado de almendras, una manzana y queso fresco', items: [['almendras', 'puñado', 0.5], ['manzana', 'pieza', 1], ['queso-fresco', 'ración', 1]],
      why: 'Las mismas calorías en mucho más volumen: fruta que llena y la proteína del queso. Comes más rato, y con cabeza.' } },
];

export const MOODS = [
  { id: 'aburrido', label: ['Aburrido', 'Aburrida'] },
  { id: 'estres', label: ['Estresado', 'Estresada'] },
  { id: 'cansado', label: ['Cansado', 'Cansada'] },
  { id: 'triste', label: ['De bajón', 'De bajón'] },
  { id: 'ansioso', label: ['Nervioso', 'Nerviosa'] },
  { id: 'celebrando', label: ['Celebrando', 'Celebrando'] },
  { id: 'bien', label: ['Bien', 'Bien'] },
];

export const HUNGER = [
  { v: 1, label: 'Nada' }, { v: 3, label: 'Poca' }, { v: 5, label: 'Algo' }, { v: 7, label: 'Bastante' }, { v: 9, label: 'Mucha' },
];
export const SLEEP = [{ v: 5, label: 'Menos de 6 h' }, { v: 6.5, label: '6–7 h' }, { v: 8, label: 'Más de 7 h' }];

/* ── alternativas sanas, por tipo de antojo ─────────────────────────── */
// food: [id de la tabla, ración, cantidad] para apuntarla de un toque; avoid: palabras de alergias/no me gusta
const ALTS = {
  dulce: [
    { label: 'Un yogur griego con canela', food: ['yogur-griego', 'unidad', 1], avoid: ['lactosa', 'leche', 'yogur'] },
    { label: 'Una pieza de fruta: manzana, pera o plátano', food: ['manzana', 'pieza', 1] },
    { label: 'Una onza de chocolate negro, despacio', food: ['chocolate-negro', 'onza', 1] },
    { label: 'Un bol de fresas o arándanos', food: ['fresas', 'ración', 1] },
    { label: 'Dos dátiles', food: ['datiles', 'unidad', 2] },
    { label: 'Una infusión de canela, regaliz o menta', food: ['infusion', 'taza', 1] },
  ],
  salado: [
    { label: 'Tomates cherry o pepino con una pizca de sal', food: ['tomate', 'unidad', 1] },
    { label: 'Seis aceitunas o unos pepinillos', food: ['aceitunas', 'unidad', 6] },
    { label: 'Palitos de zanahoria con hummus', food: ['hummus', 'cucharada', 2] },
    { label: 'Un puñadito de frutos secos (la mitad del puño)', food: ['almendras', 'puñado', 0.5], avoid: ['frutos secos', 'almendra', 'nuez'] },
    { label: 'Una tostada integral con tomate', food: ['pan-integral', 'rebanada', 1], avoid: ['gluten'] },
    { label: 'Edamame con sal', food: ['edamame', 'ración', 1], avoid: ['soja'] },
  ],
  bebida: [
    { label: 'Agua con gas, hielo y limón', food: ['agua', 'vaso', 1] },
    { label: 'Una naranja: dulce y con su fibra', food: ['naranja', 'pieza', 1] },
    { label: 'Una infusión fría con hielo', food: ['infusion', 'taza', 1] },
    { label: 'Un refresco sin azúcar, si lo necesitas', food: ['refresco-zero', 'lata', 1] },
  ],
  alcohol: [
    { label: 'Una cerveza sin alcohol, bien fría', food: ['cerveza-sin', 'caña', 1] },
    { label: 'Agua con gas, hielo y limón', food: ['agua', 'vaso', 1] },
    { label: 'Un refresco sin azúcar en copa de vino', food: ['refresco-zero', 'lata', 1] },
  ],
  picar: [
    { label: 'Palitos de zanahoria y pepino', food: ['zanahoria', 'unidad', 1] },
    { label: 'Una pieza de fruta', food: ['mandarina', 'pieza', 2] },
    { label: 'Queso fresco batido con canela', food: ['queso-batido', 'ración', 1], avoid: ['lactosa', 'leche', 'queso'] },
    { label: 'Una infusión caliente', food: ['infusion', 'taza', 1] },
  ],
};

// Comida de verdad, para cuando el antojo es hambre.
const REAL_FOOD = [
  { label: 'Una tortilla francesa con una rebanada de pan', food: ['tortilla-francesa', 'de 2 huevos', 1], avoid: ['huevo'] },
  { label: 'Un yogur proteico con fruta', food: ['skyr', 'unidad', 1], avoid: ['lactosa', 'leche', 'yogur'] },
  { label: 'Una lata de atún al natural con tomate', food: ['atun-natural', 'lata', 1], avoid: ['pescado', 'atun'] },
  { label: 'Pechuga de pavo en lonchas y una pieza de fruta', food: ['fiambre-pavo', 'loncha', 4] },
];

/* ── ¿por qué te pasa? ──────────────────────────────────────────────── */

/* ctx: { hour, weekday, hunger, mood, sleep, craving, eatenKcal, proteinG, logged,
          hoursSinceMeal, target, proteinTarget, daysTracked, sameHourCount, stalled } */
export function explain(ctx) {
  const out = [];
  const add = (score, title, text) => out.push({ score, title, text });
  const expectedByNow = ctx.target ? ctx.target * Math.min(1, Math.max(0, (ctx.hour - 7) / 15)) : 0;
  const ateLittle = ctx.logged && expectedByNow > 400 && ctx.eatenKcal < expectedByNow * 0.55;

  if (ctx.hunger >= 7 && (ctx.hoursSinceMeal >= 4 || ateLittle)) {
    add(10, 'Es hambre de verdad',
      (ctx.hoursSinceMeal >= 4 ? `Llevas unas ${Math.floor(ctx.hoursSinceMeal)} horas sin comer. ` : `Hoy llevas ${Math.round(ctx.eatenKcal)} kcal, poco para esta hora. `)
      + 'Cuando el cuerpo va corto de energía pide lo que más calorías da de golpe: dulce y grasa. No lo aguantes a pelo: come algo de verdad, con proteína, y el antojo baja solo.');
  } else if (ctx.hunger >= 7 && ctx.hoursSinceMeal < 2 && ctx.logged) {
    add(7, 'Hambre poco después de comer',
      'Has comido hace poco y aun así notas mucha hambre. Suele pasar cuando la comida fue ligera o con mucho hidrato rápido (pan blanco, zumo, bollería): sube el azúcar y baja enseguida. Bebe agua, espera un poco, y en la próxima comida añade proteína y verdura.');
  } else if (ctx.hunger >= 7) {
    add(7, 'Tienes hambre de verdad',
      'Dices que tienes mucha hambre de estómago. Eso no se calma con un capricho, sino comiendo algo de verdad: con proteína y algo de verdura o fruta. Después, si el antojo sigue, lo miramos.');
  } else if (ateLittle) {
    add(8, 'Hoy has comido muy poco',
      `Llevas ${Math.round(ctx.eatenKcal)} kcal y a esta hora te tocarían unas ${Math.round(expectedByNow / 10) * 10}. Pasar hambre de día es la receta del atracón de noche: mejor una comida equilibrada ahora que un antojo luego.`);
  }
  if (ctx.logged && ctx.proteinTarget && ctx.hour >= 14 && ctx.proteinG < ctx.proteinTarget * 0.4) {
    add(6, 'Vas corto de proteína',
      `Hoy llevas ${Math.round(ctx.proteinG)} g de proteína de los ${Math.round(ctx.proteinTarget)} que te vendrían bien. La proteína es lo que más sacia; cuando falta, el cuerpo sigue pidiendo comida aunque las calorías cuadren.`);
  }
  if (ctx.sleep && ctx.sleep < 6) {
    add(7, 'Has dormido poco',
      'Dormir poco sube la grelina (la hormona del hambre) y baja la leptina (la que te dice «ya basta»). Además, el cerebro cansado busca recompensas rápidas. Este antojo tiene mucho de sueño, no de hambre.');
  }
  if (ctx.mood === 'estres' || ctx.mood === 'ansioso') {
    add(8, 'Es el estrés hablando',
      'El estrés dispara el cortisol, y el cortisol pide azúcar y grasa: calman un rato porque dan un chute de dopamina. Es una tirita: el estrés sigue ahí después, y encima con culpa. Lo que de verdad lo baja es moverte o respirar despacio unos minutos.');
  }
  if (ctx.mood === 'aburrido') {
    add(ctx.hunger <= 3 ? 9 : 5, 'Es aburrimiento, no estómago',
      `${ctx.hunger <= 3 ? 'Con tan poca hambre de estómago, esto no es hambre: ' : ''}el cerebro aburrido busca estímulo y la comida es lo más a mano. Cambia de actividad cinco minutos y verás cómo baja.`);
  }
  if (ctx.mood === 'triste') {
    add(8, 'Buscas consuelo',
      'Querer dulce cuando estás de bajón es muy humano: da un placer rápido. Pero dura minutos y el bajón suele volver más fuerte. Hoy te mereces cuidarte: una ducha caliente, llamar a alguien o salir a que te dé el aire ayudan más.');
  }
  if (ctx.mood === 'cansado') {
    add(6, 'Es cansancio',
      'El cuerpo cansado confunde falta de energía con hambre de azúcar. Un vaso de agua fría, estirar o una siesta corta te darán más energía que el azúcar, que luego te deja más cansado.');
  }
  if (ctx.mood === 'celebrando') {
    add(5, 'Celebrar está bien',
      'Un día de celebración no estropea nada. La clave es decidir TÚ cuánto antes de empezar, en vez de que lo decida el plato. Sírvete una ración y disfrútala despacio.');
  }
  if (ctx.sameHourCount >= 2) {
    add(7, 'Es tu hora',
      `${ctx.sameHourCount} de tus antojos han sido más o menos a esta hora. Eso es costumbre: un disparador aprendido (el sofá, la tele, salir del trabajo…). Los hábitos se rompen cambiando lo que haces en ese momento, no a fuerza de voluntad.`);
  }
  if (ctx.hour >= 21 || ctx.hour < 2) {
    add(4, 'La noche es lo más difícil',
      'Por la noche la fuerza de voluntad está gastada de todo el día decidiendo cosas. Nos pasa a todos. Si puedes, lávate los dientes: el cerebro lo entiende como «la cocina ha cerrado».');
  }
  if (ctx.stalled) {
    add(4, 'La báscula lleva días quieta',
      'Cuando no ves resultados, desmotiva y aparece el «total, para qué». Pero las mesetas son normales y pasan: tu tendencia es lo que manda, y sigue ahí.');
  }
  if (ctx.daysTracked != null && ctx.daysTracked < 7) {
    add(3, 'Son los primeros días',
      'Al principio el cuerpo todavía espera sus horarios y cantidades de antes. Estos antojos son más fuertes ahora y se van suavizando en un par de semanas.');
  }
  if (ctx.craving?.kind === 'dulce' && ctx.hunger >= 5 && ctx.hoursSinceMeal >= 3) {
    add(5, 'Bajada de azúcar',
      'Unas horas después de comer (sobre todo si fue algo con mucho hidrato), el azúcar en sangre baja y el cuerpo pide dulce para subirlo rápido. Algo con proteína lo estabiliza mejor.');
  }
  // siempre, el mecanismo de fondo
  add(1, 'La ola pasa sola',
    'Un antojo sube como una ola, llega arriba y baja sola en 10–20 minutos si no le das de comer. No tienes que ganarle: sólo dejar que pase.');

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 3);
}

/* Lo que cuesta, en cosas que se entienden. */
export const BURN_WITH = ['andar-rapido', 'correr', 'bici', 'padel'];

// Los minutos de cada ejercicio que hacen falta para gastar esas kcal, con tu peso.
export function burnTimes(kcal, weightKg, ids = BURN_WITH) {
  return ids.map(id => {
    const a = ACT_BY_ID.get(id);
    const perMin = burned(a.met, weightKg, 1);
    return { id, label: a.label, min: Math.max(5, Math.round(kcal / perMin / 5) * 5) };
  });
}

// 45 → «45 min», 80 → «1 h 20 min», 120 → «2 h»
export function minutesText(m) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function cost({ kcal, weightKg, remaining, target }) {
  const times = burnTimes(kcal, weightKg);
  return {
    kcal,
    times,
    walkMin: times[0].min,
    pctRemaining: remaining > 0 ? Math.round(kcal / remaining * 100) : null,
    pctTarget: target ? Math.round(kcal / target * 100) : null,
    kgYearIfDaily: kcal * 365 / 7700,
  };
}

/* ── qué tipo de calorías son ───────────────────────────────────────── */

const GOOD_FIRST = t => (TYPES[t]?.tone === 'good' ? 0 : TYPES[t]?.tone === 'meh' ? 1 : 2);

// Las etiquetas de un antojo (las de su alimento).
export function cravingQuality(craving) {
  return foodQuality(FOODS_BY_ID.get(craving.food[0])) || { q: 'r', tags: [] };
}

// El cambio de mismas calorías: sus raciones, sus totales y sus etiquetas (las buenas primero).
export function swapFor(craving) {
  const sw = craving.swap;
  if (!sw) return null;
  const parts = sw.items.map(portionOf).filter(Boolean);
  const sum = k => parts.reduce((a, x) => a + x[k], 0);
  const tags = [...new Set(parts.flatMap(x => foodQuality(x.item)?.tags || []))].sort((a, b) => GOOD_FIRST(a) - GOOD_FIRST(b));
  return { label: sw.label, why: sw.why, parts, kcal: sum('kcal'), p: sum('p'), c: sum('c'), f: sum('f'), tags };
}

// Cuánto sacia, por lo que trae: proteína, fibra… o sólo azúcar.
export function satiety(tags = [], proteinG = 0) {
  const good = tags.some(t => ['proteina', 'fibra', 'legumbre', 'integral', 'grasa-buena'].includes(t)) || proteinG >= 10;
  const bad = tags.some(t => ['azucar', 'liquido', 'alcohol', 'refinado', 'ultra'].includes(t));
  return good && !bad ? 'mucho' : good ? 'algo' : bad ? 'poco' : 'algo';
}

export function alternatives(kind, hunger, habits) {
  const avoid = `${habits?.allergies || ''} ${habits?.dislikes || ''}`.toLowerCase();
  const ok = a => !(a.avoid || []).some(w => avoid.includes(w));
  const base = (ALTS[kind] || ALTS.picar).filter(ok);
  const real = REAL_FOOD.filter(ok);
  return hunger >= 7 ? [...real.slice(0, 2), ...base.slice(0, 3)] : base.slice(0, 5);
}

export function portionOf([id, unit, qty]) {
  const f = FOODS_BY_ID.get(id);
  if (!f) return null;
  const u = f.u.find(([n]) => n === unit) || f.u[0];
  const grams = u[1] * qty;
  const n = nutrientsFor(f, grams);
  return { item: f, unit: u[0], qty, grams, kcal: Math.round(n.kcal), p: Math.round(n.p * 10) / 10, c: Math.round(n.c * 10) / 10, f: Math.round(n.f * 10) / 10 };
}

// Una ración más pequeña del mismo antojo, para comérselo con cabeza.
export function smallerPortion(craving) {
  const [id, unit, qty] = craving.food;
  const small = qty >= 2 ? Math.max(1, Math.floor(qty / 2)) : qty === 1.5 ? 0.5 : 0.5;
  return portionOf([id, unit, small]);
}

/* ── tu mapa de antojos ─────────────────────────────────────────────── */

export const BLOCKS = [
  { id: 0, label: 'Madrugada', from: 0, to: 7 },
  { id: 1, label: 'Mañana', from: 7, to: 12 },
  { id: 2, label: 'Mediodía', from: 12, to: 16 },
  { id: 3, label: 'Tarde', from: 16, to: 20 },
  { id: 4, label: 'Noche', from: 20, to: 24 },
];
export const blockOf = h => BLOCKS.find(b => h >= b.from && h < b.to).id;

export function cravingStats(cravings = [], today) {
  const last30 = cravings.filter(c => c.date > addDaysIso(today, -30));
  const beaten = last30.filter(c => c.outcome === 'resistido' || c.outcome === 'alternativa').length;
  const grid = Array.from({ length: 7 }, () => Array(5).fill(0));   // lunes..domingo × bloques
  cravings.forEach(c => { grid[(c.weekday + 6) % 7][blockOf(c.hour)]++; });
  let peak = null;
  grid.forEach((row, d) => row.forEach((n, b) => { if (n && (!peak || n > peak.n)) peak = { d, b, n }; }));
  const byHour = Array(24).fill(0);
  cravings.forEach(c => { byHour[c.hour]++; });
  const peakHour = byHour.some(Boolean) ? byHour.indexOf(Math.max(...byHour)) : null;
  return { total30: last30.length, beaten30: beaten, grid, peak, peakHour, peakHourCount: peakHour != null ? byHour[peakHour] : 0 };
}

/* ── el análisis a largo plazo: tus antojos cruzados con lo que comes ──
   Sólo afirma lo que los datos sostienen: cada comparación pide al menos 3
   días en cada grupo y una diferencia clara (×1,5 o más). Si no, se calla. */

const MEAL_BREAKFAST = ['desayuno'];

function dayInfo(food, date) {
  const entries = food?.[date] || [];
  const kcal = entries.reduce((a, e) => a + (e.kcal || 0), 0);
  const protein = entries.reduce((a, e) => a + (e.p || 0), 0);
  const breakfast = entries.filter(e => MEAL_BREAKFAST.includes(e.meal)).reduce((a, e) => a + (e.kcal || 0), 0);
  return { logged: kcal >= 800, kcal, protein, breakfast };
}

const rate = (days, counts) => days.length ? days.reduce((a, d) => a + (counts.get(d) || 0), 0) / days.length : 0;
const x = v => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(v);

export function analyzeCravings(cravings = [], food = {}, today, proteinTarget) {
  const insights = [];
  if (cravings.length < 5) return { insights, need: 5 - cravings.length };
  const from = addDaysIso(today, -60);
  const recent = cravings.filter(c => c.date > from);
  const counts = new Map();
  recent.forEach(c => counts.set(c.date, (counts.get(c.date) || 0) + 1));
  const days = [];
  for (let i = 0; i < 60; i++) days.push(addDaysIso(today, -i));
  const logged = days.map(d => ({ d, ...dayInfo(food, d) })).filter(i => i.logged);

  const compare = (split, textFn) => {
    const a = logged.filter(split).map(i => i.d), b = logged.filter(i => !split(i)).map(i => i.d);
    if (a.length < 3 || b.length < 3) return;
    const ra = rate(a, counts), rb = rate(b, counts);
    if (ra >= rb * 1.5 && ra - rb >= 0.3) insights.push(textFn(ra, rb));
  };

  compare(i => i.breakfast < 250,
    (ra, rb) => ({ title: 'El desayuno cuenta', text: `Los días que desayunas poco (menos de 250 kcal) tienes ${x(ra)} antojos de media; los días que desayunas bien, ${x(rb)}. Un desayuno con proteína te ahorra antojos por la tarde.` }));
  if (proteinTarget) compare(i => i.protein < proteinTarget * 0.6,
    (ra, rb) => ({ title: 'La proteína sacia', text: `Los días con poca proteína tienes ${x(ra)} antojos de media, y ${x(rb)} cuando llegas a lo tuyo. Subir la proteína es de lo que más te va a ayudar.` }));
  compare(i => i.kcal < 1200,
    (ra, rb) => ({ title: 'Comer poco te pasa factura', text: `Los días que comes muy poco (menos de 1.200 kcal) acabas con ${x(ra)} antojos, frente a ${x(rb)} el resto. Pasar hambre no adelanta: rebota en forma de antojo.` }));

  // el sueño y el ánimo que tú mismo cuentas al pulsar el botón
  const withSleep = recent.filter(c => c.sleep != null);
  const short = withSleep.filter(c => c.sleep < 6).length;
  if (withSleep.length >= 5 && short / withSleep.length >= 0.4) {
    insights.push({ title: 'El sueño', text: `En ${short} de ${withSleep.length} antojos habías dormido menos de 6 horas. Dormir más es, para ti, una forma de comer menos.` });
  }
  const moods = new Map();
  recent.filter(c => c.mood && c.mood !== 'bien').forEach(c => moods.set(c.mood, (moods.get(c.mood) || 0) + 1));
  const topMood = [...moods].sort((a, b) => b[1] - a[1])[0];
  const moodText = { aburrido: 'aburrimiento', estres: 'estrés', cansado: 'cansancio', triste: 'bajón', ansioso: 'nervios', celebrando: 'celebraciones' };
  if (topMood && topMood[1] >= 3 && topMood[1] / recent.length >= 0.35) {
    insights.push({ title: 'Lo que hay detrás', text: `Tu disparador más habitual es el ${moodText[topMood[0]]}: está detrás de ${topMood[1]} de tus ${recent.length} antojos. Tenlo en cuenta: lo que lo calma no es comida.` });
  }
  // cuánto después de comer llegan
  const gaps = recent.map(c => {
    const prev = (food?.[c.date] || []).filter(e => e.t && e.t < c.t).reduce((a, e) => Math.max(a, e.t), 0);
    return prev ? (c.t - prev) / 3600000 : null;
  }).filter(g => g != null && g < 12);
  if (gaps.length >= 4) {
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (avg >= 3) insights.push({ title: 'Las horas sin comer', text: `Tus antojos llegan de media ${x(avg)} horas después de la última comida. Un tentempié con proteína a las ${Math.max(2, Math.floor(avg) - 1)} horas los cortaría antes de que empiecen.` });
  }
  // qué momento del día pierdes más
  const lostByBlock = Array(5).fill(0), allByBlock = Array(5).fill(0);
  recent.filter(c => c.outcome).forEach(c => { allByBlock[blockOf(c.hour)]++; if (c.outcome === 'comido') lostByBlock[blockOf(c.hour)]++; });
  const worst = lostByBlock.map((l, i) => ({ i, l, n: allByBlock[i] })).filter(b => b.n >= 3).sort((a, b) => b.l / b.n - a.l / a.n)[0];
  if (worst && worst.l / worst.n >= 0.5) {
    insights.push({ title: 'Tu momento difícil', text: `Por la ${BLOCKS[worst.i].label.toLowerCase()} acabas comiéndotelo ${worst.l} de cada ${worst.n} veces. Prepara para ese rato una alternativa a mano antes de que llegue.` });
  }
  return { insights, need: 0, logged: logged.length };
}

function addDaysIso(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  const p = x => String(x).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}
