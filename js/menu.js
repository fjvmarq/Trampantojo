/* Trampantojo — el menú de la semana y su lista de la compra.

   Siete días de platos de casa (los de ideas.js, todos de calorías buenas),
   repartidos en cinco tomas y con las RACIONES AJUSTADAS a tu objetivo: un
   menú que se queda corto es un menú que acaba en antojo. Respeta tus
   alergias y lo que no te gusta, busca proteína y no repite el mismo plato
   dos días seguidos. «Otra propuesta» cambia la semilla y sale otro menú; un
   plato suelto también se puede cambiar.

   La lista de la compra junta los ingredientes de toda la semana, pasados a
   cantidades de tienda (el arroz, en crudo; la tortilla, en huevos) y
   ordenados por pasillos. */

import { IDEAS, ideaNutrients } from './ideas.js?v=0.10.1';
import { FOODS_BY_ID, norm } from './foods.js?v=0.10.1';

// las cinco tomas, qué tipo de plato va en cada una y qué parte del día se lleva
export const SLOTS = [
  { id: 'desayuno', label: 'Desayuno', meal: 'desayuno', share: 0.22 },
  { id: 'media', label: 'Media mañana', meal: 'picoteo', share: 0.09 },
  { id: 'comida', label: 'Comida', meal: 'comida', share: 0.33 },
  { id: 'merienda', label: 'Merienda', meal: 'picoteo', share: 0.09 },
  { id: 'cena', label: 'Cena', meal: 'cena', share: 0.27 },
];

export const IDEAS_BY_ID = new Map(IDEAS.map(i => [i.id, i]));

// La ración: ×1 es la de la idea; se ajusta de media en media, hasta el doble.
// En los tentempiés, enteras: «1,5 yogures» no se compra.
export function portionFactor(aim, kcal, whole = false) {
  if (!(kcal > 0)) return 1;
  const step = whole ? 1 : 2;
  return Math.min(2, Math.max(1, Math.round(aim / kcal * step) / step));
}

export function factorText(f) {
  return ({ 1.5: 'ración y media', 2: 'ración doble' })[f] || '';
}

const STOP = ['para', 'poco', 'mucho', 'nada', 'algo', 'muy', 'sin', 'con', 'los', 'las', 'del', 'que'];
function allowed(idea, avoidText) {
  const avoid = norm(avoidText || '');
  const words = avoid.split(' ').filter(w => w.length >= 4 && !STOP.includes(w));
  return !idea.tags.some(t => avoid.includes(norm(t))) && !words.some(w => norm(idea.name).includes(w));
}

// un «azar» fijo: la misma semilla da siempre el mismo menú (y así no baila al recargar)
function jitter(seed, day, slot, id) {
  let h = 2166136261 ^ seed;
  for (const c of `${day}|${slot}|${id}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

function addDaysIso(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  const p = x => String(x).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

/* El plato de una toma, eligiendo entre los permitidos.
   used: { slotId: [ids de días anteriores, el último al final] } */
export function pickFor(slot, { dayKcal, avoidText, seed, dayIndex, used = {}, exclude = [], proteinFocus = true }) {
  const aim = dayKcal * slot.share;
  const prev = used[slot.id] || [];
  const cands = IDEAS.filter(i => i.meal === slot.meal && allowed(i, avoidText) && !exclude.includes(i.id));
  if (!cands.length) return null;
  const scored = cands.map(i => {
    const n = ideaNutrients(i);
    const f = portionFactor(aim, n.kcal, slot.meal === 'picoteo');
    let score = -Math.abs(n.kcal * f - aim) / aim;                 // que cuadre con lo que toca
    if (proteinFocus) score += Math.min(0.35, n.p * f / 120);       // la proteína sacia
    if (prev[prev.length - 1] === i.id) score -= 2;                 // nunca dos días seguidos
    score -= 0.35 * prev.filter(x => x === i.id).length;            // y cuantas menos veces, mejor
    score += 0.45 * jitter(seed, dayIndex, slot.id, i.id);          // variedad
    return { id: i.id, f, score };
  }).sort((a, b) => b.score - a.score);
  return { id: scored[0].id, f: scored[0].f };
}

// La semana entera.
export function buildMenu({ start, days = 7, dayKcal, avoidText = '', seed = 1 }) {
  const used = {};
  const out = [];
  for (let d = 0; d < days; d++) {
    const date = addDaysIso(start, d);
    const meals = {};
    for (const slot of SLOTS) {
      // la media mañana y la merienda no repiten entre sí el mismo día
      const exclude = slot.id === 'merienda' && meals.media ? [meals.media.id] : [];
      const pick = pickFor(slot, { dayKcal, avoidText, seed, dayIndex: d, used, exclude });
      if (!pick) continue;
      meals[slot.id] = pick;
      (used[slot.id] = used[slot.id] || []).push(pick.id);
    }
    out.push({ date, meals });
  }
  return { start, seed, dayKcal, days: out };
}

// Lo que suma un plato con su ración (kcal, proteína y sus ingredientes en gramos).
export function mealNutrients(pick) {
  const idea = IDEAS_BY_ID.get(pick?.id);
  if (!idea) return null;
  const n = ideaNutrients(idea);
  const f = pick.f || 1;
  return {
    idea, f, kcal: n.kcal * f, p: n.p * f,
    parts: n.parts.map(x => ({ ...x, qty: x.qty * f, grams: x.grams * f })),
  };
}

export function dayTotal(day) {
  return Object.values(day?.meals || {}).reduce((a, pick) => {
    const n = mealNutrients(pick);
    return n ? { kcal: a.kcal + n.kcal, p: a.p + n.p } : a;
  }, { kcal: 0, p: 0 });
}

/* ── la lista de la compra ──────────────────────────────────────────── */

// Cómo se compra lo que en la tabla es un plato hecho o un peso cocinado.
const SHOP_AS = {
  'tortilla-francesa': { id: 'huevo', factor: 1 / 1.05, note: 'para las tortillas' },     // 115 g de tortilla ≈ 2 huevos (110 g)
  revuelto: { id: 'huevo', factor: 0.7, note: 'para el revuelto' },
  'cafe-leche': { id: 'leche-semi', factor: 0.8, note: 'para el café' },
  'arroz-cocido': { id: 'arroz-crudo', factor: 0.36 },
  'pasta-cocida': { id: 'pasta-cruda', factor: 0.43 },
  cuscus: { id: 'cuscus', factor: 0.4, name: 'Cuscús (en seco)' },
};

export const AISLES = ['Fruta y verdura', 'Carne y pescado', 'Lácteos y huevos', 'Pan y cereales', 'Legumbres, conservas y platos', 'Despensa'];
const AISLE_OF = {
  tomate: 0, fresas: 0, arandanos: 0, platano: 0, aguacate: 0, manzana: 0, 'verduras-plancha': 0, naranja: 0, 'ensalada-verde': 0,
  'patata-cocida': 0, brocoli: 0, espinacas: 0, 'judias-verdes': 0, kiwi: 0, zanahoria: 0, 'ensalada-mixta': 0, lechuga: 0, mandarina: 0, pera: 0,
  'pollo-plancha': 1, 'pavo-plancha': 1, 'ternera-plancha': 1, salmon: 1, merluza: 1, 'fiambre-pavo': 1,
  'yogur-griego': 2, skyr: 2, 'queso-fresco': 2, 'leche-semi': 2, 'yogur-natural': 2, huevo: 2,
  'pan-integral': 3, avena: 3, 'arroz-crudo': 3, 'pasta-cruda': 3, cuscus: 3,
  lentejas: 4, garbanzos: 4, alubias: 4, 'sardinas-lata': 4, 'atun-natural': 4, 'tomate-frito': 4, pisto: 4, menestra: 4, gazpacho: 4, 'crema-verduras': 4, hummus: 4,
  aceite: 5, nueces: 5, almendras: 5,
};

// cómo se llama en la tienda lo que en la tabla está cocinado
const SHOP_NAME = {
  brocoli: 'Brócoli', 'judias-verdes': 'Judías verdes', 'patata-cocida': 'Patatas', espinacas: 'Espinacas',
  'verduras-plancha': 'Verduras para la plancha (calabacín, pimiento, berenjena…)', 'ensalada-verde': 'Lechuga y verde para ensalada',
  'pollo-plancha': 'Pechuga de pollo', 'pavo-plancha': 'Pechuga de pavo', 'ternera-plancha': 'Filetes de ternera',
  salmon: 'Salmón', merluza: 'Merluza', 'crema-verduras': 'Crema de verduras', 'ensalada-mixta': 'Ensalada mixta (lechuga, tomate, atún y huevo)',
};

// la ración con la que se compra, si no es la primera de la tabla
const SHOP_UNIT = { aguacate: 'unidad', 'queso-fresco': 'tarrina', hummus: 'g', 'tomate-frito': 'g', 'verduras-plancha': 'g', 'ensalada-verde': 'g', 'arroz-crudo': 'g', 'pasta-cruda': 'g', cuscus: 'g', avena: 'g' };
// lo que se compra por piezas: siempre entero
const WHOLE_UNITS = ['rebanada', 'loncha', 'unidad', 'pieza', 'filete', 'lata', 'cucharada', 'cucharadita', 'onza', 'tarrina'];
const LIQUIDS = ['leche-semi', 'leche-entera', 'leche-desnatada', 'bebida-soja', 'bebida-avena', 'gazpacho'];

// Una cantidad de tienda: «3 piezas (≈ 540 g)», «2 filetes (≈ 300 g)», «1,5 L», «150 g».
export function shopAmount(food, grams) {
  if (LIQUIDS.includes(food.id)) {
    const l = Math.ceil(grams / 250) / 4;                            // de cuarto en cuarto de litro
    return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(l)} L`;
  }
  if (SHOP_UNIT[food.id] === 'g') return `${Math.round(grams / 10) * 10} g`;
  const u = (SHOP_UNIT[food.id] && food.u?.find(([n]) => n === SHOP_UNIT[food.id])) || food.u?.[0];
  if (!u || u[1] <= 0) return `${Math.round(grams)} g`;
  const per = WHOLE_UNITS.includes(u[0]) ? 1 : 2;                   // enteras o a medias, redondeando hacia arriba
  const count = Math.ceil(grams / u[1] * per - 0.15) / per;
  const nice = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(Math.max(0.5, count));
  const unit = count > 1 && !/\s|s$/.test(u[0]) ? (/[aeiouáéíóú]$/.test(u[0]) ? `${u[0]}s` : /ón$/.test(u[0]) ? `${u[0].slice(0, -2)}ones` : `${u[0]}es`) : u[0];
  return /\bg\b|ml/.test(u[0]) ? `${Math.round(grams)} g` : `${nice} ${unit} (≈ ${Math.round(grams / 10) * 10} g)`;
}

export function shoppingList(menu) {
  const grams = new Map();
  for (const day of menu?.days || []) {
    for (const pick of Object.values(day.meals)) {
      const n = mealNutrients(pick);
      if (!n) continue;
      for (const part of n.parts) {
        const how = SHOP_AS[part.food.id];
        const id = how ? how.id : part.food.id;
        const g = part.grams * (how ? how.factor : 1);
        const cur = grams.get(id) || { grams: 0, notes: new Set(), name: how?.name };
        cur.grams += g;
        if (how?.note) cur.notes.add(how.note);
        grams.set(id, cur);
      }
    }
  }
  const groups = AISLES.map(name => ({ name, items: [] }));
  for (const [id, { grams: g, notes, name }] of grams) {
    const food = FOODS_BY_ID.get(id);
    if (!food) continue;
    const item = { id, name: name || SHOP_NAME[id] || food.n.replace(/ \((peso en seco|escurrido|sin aliñar|con aceite)\)$/, ''), amount: shopAmount(food, g), grams: g, note: [...notes].join(', ') };
    groups[AISLE_OF[id] ?? 5].items.push(item);
  }
  groups.forEach(gr => gr.items.sort((a, b) => a.name.localeCompare(b.name, 'es')));
  return groups.filter(gr => gr.items.length);
}

// La lista en texto, para mandarla por WhatsApp o apuntarla en otro sitio.
export function shoppingText(groups, checked = {}) {
  return ['Lista de la compra (Trampantojo)', ...groups.flatMap(gr => [
    '', gr.name.toUpperCase(),
    ...gr.items.map(it => `${checked[it.id] ? '✓' : '☐'} ${it.name}: ${it.amount}${it.note ? ` (${it.note})` : ''}`),
  ])].join('\n');
}
