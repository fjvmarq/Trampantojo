/* Trampantojo — ideas de comida según lo que llevas hoy.

   Platos de casa, sencillos, hechos con los alimentos de la tabla (así sus
   calorías salen de la misma fuente que todo lo demás). Se proponen para la
   próxima comida, cuadrando con lo que te queda de calorías y dando
   preferencia a la proteína si vas corto. Nunca se propone algo que choque
   con tus alergias o con lo que no te gusta. */

import { FOODS_BY_ID, nutrientsFor, norm } from './foods.js?v=0.12.1';

// items: [id de la tabla, ración, cantidad]; tags: para descartar por alergias o gustos
const IDEAS = [
  // desayunos
  { id: 'd-tostada-tomate', name: 'Tostada integral con tomate y aceite, y café con leche', meal: 'desayuno', items: [['pan-integral', 'rebanada', 2], ['tomate', 'unidad', 0.5], ['aceite', 'cucharadita', 1], ['cafe-leche', 'taza', 1]], tags: ['gluten', 'lactosa', 'leche'] },
  { id: 'd-griego-avena', name: 'Yogur griego con avena y fruta', meal: 'desayuno', items: [['yogur-griego', 'unidad', 1], ['avena', 'cucharada', 3], ['fresas', 'ración', 1]], tags: ['lactosa', 'leche', 'yogur', 'gluten'] },
  { id: 'd-tortilla', name: 'Tortilla francesa con una tostada', meal: 'desayuno', items: [['tortilla-francesa', 'de 2 huevos', 1], ['pan-integral', 'rebanada', 1]], tags: ['huevo', 'gluten'] },
  { id: 'd-skyr', name: 'Skyr con arándanos y unas nueces', meal: 'desayuno', items: [['skyr', 'unidad', 1], ['arandanos', 'ración', 1], ['nueces', 'puñado', 0.3]], tags: ['lactosa', 'leche', 'yogur', 'frutos secos', 'nuez'] },
  { id: 'd-pavo-queso', name: 'Tostada con pavo y queso fresco', meal: 'desayuno', items: [['pan-integral', 'rebanada', 2], ['fiambre-pavo', 'loncha', 3], ['queso-fresco', 'ración', 0.5]], tags: ['gluten', 'lactosa', 'leche', 'queso'] },
  { id: 'd-porridge', name: 'Porridge de avena con leche y plátano', meal: 'desayuno', items: [['avena', 'ración', 1], ['leche-semi', 'taza', 1], ['platano', 'pieza', 0.5]], tags: ['gluten', 'lactosa', 'leche'] },
  { id: 'd-aguacate-huevo', name: 'Tostada con aguacate y huevo', meal: 'desayuno', items: [['pan-integral', 'rebanada', 1], ['aguacate', 'medio', 0.5], ['huevo', 'unidad', 1]], tags: ['gluten', 'huevo'] },
  { id: 'd-fruta-cafe', name: 'Café con leche y una pieza de fruta', meal: 'desayuno', items: [['cafe-leche', 'taza', 1], ['manzana', 'pieza', 1]], tags: ['lactosa', 'leche'] },
  // comidas
  { id: 'c-lentejas', name: 'Lentejas con verduras y una pieza de fruta', meal: 'comida', items: [['lentejas', 'plato', 1], ['verduras-plancha', 'plato', 0.5], ['naranja', 'pieza', 1]], tags: [] },
  { id: 'c-pollo-arroz', name: 'Pollo a la plancha con arroz y ensalada', meal: 'comida', items: [['pollo-plancha', 'filete', 1], ['arroz-cocido', 'ración', 1], ['ensalada-verde', 'plato', 1], ['aceite', 'cucharada', 1]], tags: ['carne', 'pollo'] },
  { id: 'c-salmon', name: 'Salmón con patata cocida y verduras', meal: 'comida', items: [['salmon', 'filete', 1], ['patata-cocida', 'unidad', 1], ['brocoli', 'ración', 1]], tags: ['pescado', 'salmon'] },
  { id: 'c-garbanzos', name: 'Garbanzos con espinacas', meal: 'comida', items: [['garbanzos', 'plato', 1], ['espinacas', 'ración', 1], ['aceite', 'cucharada', 1]], tags: [] },
  { id: 'c-pasta-atun', name: 'Pasta con atún y tomate', meal: 'comida', items: [['pasta-cocida', 'ración', 1], ['atun-natural', 'lata', 1], ['tomate-frito', 'ración', 1]], tags: ['gluten', 'pescado', 'atun'] },
  { id: 'c-ternera', name: 'Filete de ternera con verduras y patata', meal: 'comida', items: [['ternera-plancha', 'filete', 1], ['verduras-plancha', 'plato', 1], ['patata-cocida', 'unidad', 1]], tags: ['carne', 'ternera'] },
  { id: 'c-merluza', name: 'Merluza con judías verdes y patata', meal: 'comida', items: [['merluza', 'filete', 1], ['judias-verdes', 'plato', 1], ['patata-cocida', 'unidad', 1], ['aceite', 'cucharada', 1]], tags: ['pescado', 'merluza'] },
  { id: 'c-ensalada-completa', name: 'Ensalada completa con atún y huevo, y pan', meal: 'comida', items: [['ensalada-mixta', 'plato', 1], ['aceite', 'cucharada', 1], ['pan-integral', 'rebanada', 1]], tags: ['pescado', 'atun', 'huevo', 'gluten'] },
  { id: 'c-pavo-cuscus', name: 'Pavo a la plancha con cuscús y pisto', meal: 'comida', items: [['pavo-plancha', 'filete', 1], ['cuscus', 'plato', 0.7], ['pisto', 'ración', 1]], tags: ['carne', 'gluten'] },
  { id: 'c-alubias', name: 'Alubias con verduras', meal: 'comida', items: [['alubias', 'plato', 1], ['menestra', 'plato', 0.5]], tags: [] },
  // cenas
  { id: 'n-tortilla-ensalada', name: 'Tortilla francesa con ensalada', meal: 'cena', items: [['tortilla-francesa', 'de 2 huevos', 1], ['ensalada-verde', 'plato', 1], ['aceite', 'cucharadita', 1]], tags: ['huevo'] },
  { id: 'n-crema-pollo', name: 'Crema de verduras y pechuga de pollo', meal: 'cena', items: [['crema-verduras', 'plato', 1], ['pollo-plancha', 'ración', 1]], tags: ['carne', 'pollo'] },
  { id: 'n-merluza-verduras', name: 'Merluza a la plancha con verduras', meal: 'cena', items: [['merluza', 'filete', 1], ['verduras-plancha', 'plato', 1]], tags: ['pescado', 'merluza'] },
  { id: 'n-revuelto', name: 'Revuelto de setas con una tostada', meal: 'cena', items: [['revuelto', 'ración', 1], ['pan-integral', 'rebanada', 1]], tags: ['huevo', 'gluten'] },
  { id: 'n-sardinas', name: 'Sardinas con tomate y pan', meal: 'cena', items: [['sardinas-lata', 'lata', 1], ['tomate', 'unidad', 1], ['pan-integral', 'rebanada', 1]], tags: ['pescado', 'gluten'] },
  { id: 'n-pavo-verduras', name: 'Pavo a la plancha con verduras', meal: 'cena', items: [['pavo-plancha', 'filete', 1], ['verduras-plancha', 'plato', 1]], tags: ['carne'] },
  { id: 'n-ensalada-garbanzos', name: 'Ensalada templada de garbanzos', meal: 'cena', items: [['garbanzos', 'ración', 1], ['ensalada-verde', 'plato', 1], ['aceite', 'cucharada', 1]], tags: [] },
  { id: 'n-gazpacho-huevo', name: 'Gazpacho y un huevo cocido con atún', meal: 'cena', items: [['gazpacho', 'bol', 1], ['huevo', 'unidad', 1], ['atun-natural', 'lata', 1]], tags: ['huevo', 'pescado', 'atun'] },
  { id: 'n-ligera', name: 'Cena ligera: yogur y fruta', meal: 'cena', items: [['yogur-natural', 'unidad', 1], ['kiwi', 'pieza', 2]], tags: ['lactosa', 'leche', 'yogur'] },
  // picoteo
  { id: 's-fruta-nueces', name: 'Una pieza de fruta y un puñadito de frutos secos', meal: 'picoteo', items: [['manzana', 'pieza', 1], ['almendras', 'puñado', 0.5]], tags: ['frutos secos', 'almendra'] },
  { id: 's-yogur', name: 'Un yogur natural', meal: 'picoteo', items: [['yogur-natural', 'unidad', 1]], tags: ['lactosa', 'leche', 'yogur'] },
  { id: 's-hummus', name: 'Hummus con palitos de zanahoria', meal: 'picoteo', items: [['hummus', 'cucharada', 3], ['zanahoria', 'unidad', 1]], tags: [] },
  { id: 's-queso-tomate', name: 'Queso fresco con tomate', meal: 'picoteo', items: [['queso-fresco', 'ración', 1], ['tomate', 'unidad', 1]], tags: ['lactosa', 'leche', 'queso'] },
  { id: 's-skyr', name: 'Un skyr (yogur proteico)', meal: 'picoteo', items: [['skyr', 'unidad', 1]], tags: ['lactosa', 'leche', 'yogur'] },
];

/* Cómo se hace cada idea: cocina de casa, sencilla y sin freír. Las cantidades
   son para una ración; el menú dice cuándo toca ración y media o doble. */
export const HOW = {
  'd-tostada-tomate': ['Tuesta el pan integral.', 'Ralla medio tomate por encima, con una cucharadita de aceite de oliva y una pizca de sal.', 'Acompaña con el café con leche, sin azúcar.'],
  'd-griego-avena': ['Pon el yogur griego en un bol.', 'Añade tres cucharadas de copos de avena y las fresas troceadas.', 'Canela por encima: endulza sin azúcar.'],
  'd-tortilla': ['Bate dos huevos con una pizca de sal.', 'Cuájalos en una sartén antiadherente con unas gotas de aceite, a fuego medio.', 'Con una rebanada de pan integral tostado.'],
  'd-skyr': ['Sirve el skyr en un bol.', 'Por encima, los arándanos y dos o tres nueces troceadas.'],
  'd-pavo-queso': ['Tuesta dos rebanadas de pan integral.', 'Pon encima el queso fresco y tres lonchas de pavo.', 'Un poco de orégano o pimienta le da gracia.'],
  'd-porridge': ['Calienta la leche con la avena a fuego suave 4–5 minutos, removiendo (o 2 minutos en el microondas).', 'Añade medio plátano en rodajas y canela.'],
  'd-aguacate-huevo': ['Cuece el huevo 10 minutos (o hazlo a la plancha).', 'Tuesta el pan y aplasta encima medio aguacate con sal y unas gotas de limón.', 'Corona con el huevo en rodajas.'],
  'd-fruta-cafe': ['Café con leche sin azúcar.', 'La fruta, entera y masticada: en zumo pierde la fibra y sacia menos.'],
  'c-lentejas': ['Lentejas de bote bien escurridas, o guisadas en casa con zanahoria, cebolla y pimiento.', 'Rehógalas un par de minutos con las verduras a la plancha y un poco de pimentón.', 'De postre, la naranja.'],
  'c-pollo-arroz': ['Pechuga a la plancha con sal y especias (pimentón, ajo en polvo).', 'Arroz cocido unos 12 minutos (unos 55 g en crudo por ración).', 'Ensalada aliñada con una cucharada de aceite de oliva.'],
  'c-salmon': ['Cuece la patata 20 minutos (o pinchada, 6–7 minutos en el microondas).', 'Brócoli al vapor, 5 minutos.', 'Salmón a la plancha, 3–4 minutos por cada lado, con sal y limón.'],
  'c-garbanzos': ['Garbanzos de bote, bien escurridos.', 'Dora un ajo en una cucharada de aceite, añade las espinacas y deja que se reduzcan.', 'Suma los garbanzos y una pizca de comino o pimentón: dos minutos más.'],
  'c-pasta-atun': ['Cuece la pasta al dente (80 g en crudo).', 'Mézclala con el atún escurrido y el tomate frito.', 'Si puede ser integral, mejor: sacia más.'],
  'c-ternera': ['Filete a la plancha bien caliente, 2 minutos por cada lado.', 'Verduras a la plancha con unas gotas de aceite.', 'Patata cocida o asada de guarnición.'],
  'c-merluza': ['Cuece juntas las judías verdes y la patata, unos 15 minutos.', 'Merluza a la plancha o al horno, con ajo y perejil.', 'Aliña todo con una cucharada de aceite de oliva.'],
  'c-ensalada-completa': ['Lechuga, tomate, cebolla, una lata de atún y un huevo cocido.', 'Aliña con una cucharada de aceite y vinagre.', 'Con una rebanada de pan integral.'],
  'c-pavo-cuscus': ['Hidrata el cuscús con el mismo volumen de agua hirviendo, tapado 5 minutos, y suéltalo con un tenedor.', 'Pavo a la plancha.', 'El pisto caliente, por encima o al lado.'],
  'c-alubias': ['Alubias de bote, bien escurridas.', 'Caliéntalas con la menestra, una hoja de laurel y un poco de pimentón.'],
  'n-tortilla-ensalada': ['Tortilla francesa de dos huevos en sartén antiadherente.', 'Ensalada verde con una cucharadita de aceite de oliva.'],
  'n-crema-pollo': ['Crema de verduras, casera o de brik (mejor sin nata).', 'La pechuga a la plancha, en tiras.'],
  'n-merluza-verduras': ['Merluza a la plancha con ajo y perejil.', 'Verduras a la plancha: calabacín, pimiento, berenjena…'],
  'n-revuelto': ['Saltea las setas con un ajo en la sartén.', 'Añade dos huevos batidos y remueve hasta que cuajen, sin secarlos.', 'Con una tostada de pan integral.'],
  'n-sardinas': ['Sardinas en lata, escurridas.', 'Tomate en rodajas con sal y orégano.', 'Pan integral tostado.'],
  'n-pavo-verduras': ['Pavo a la plancha con especias.', 'Verduras a la plancha o al horno (200 °C, 20 minutos).'],
  'n-ensalada-garbanzos': ['Calienta los garbanzos en la sartén con un poco de comino.', 'Mézclalos templados con la ensalada verde y aliña con una cucharada de aceite.'],
  'n-gazpacho-huevo': ['Un bol de gazpacho bien frío.', 'Huevo cocido (10 minutos) y una lata de atún al natural, en ensalada o solos.'],
  'n-ligera': ['Un yogur natural con dos kiwis troceados.'],
  's-fruta-nueces': ['Una pieza de fruta y medio puñado de almendras (unas diez).'],
  's-yogur': ['Un yogur natural; si lo quieres más dulce, canela.'],
  's-hummus': ['Zanahoria en palitos para mojar en tres cucharadas de hummus.'],
  's-queso-tomate': ['Queso fresco con tomate en rodajas, sal y orégano.'],
  's-skyr': ['Un skyr natural; con canela, si te apetece algo dulce.'],
};

// La comida siguiente según la hora (media mañana y merienda cuentan como picoteo).
export function nextMeal(hour) {
  if (hour < 10.5) return 'desayuno';
  if (hour < 12.5) return 'picoteo';
  if (hour < 16) return 'comida';
  if (hour < 19.5) return 'picoteo';
  if (hour < 23) return 'cena';
  return 'picoteo';
}

export const MEAL_SHARE = { desayuno: 0.25, comida: 0.35, cena: 0.28, picoteo: 0.1 };

export function ideaNutrients(idea) {
  let t = { kcal: 0, p: 0, c: 0, f: 0 };
  const parts = [];
  for (const [id, unit, qty] of idea.items) {
    const food = FOODS_BY_ID.get(id);
    if (!food) continue;
    const u = food.u.find(([n]) => n === unit) || food.u[0];
    const grams = u[1] * qty;
    const n = nutrientsFor(food, grams);
    t = { kcal: t.kcal + n.kcal, p: t.p + n.p, c: t.c + n.c, f: t.f + n.f };
    parts.push({ food, unit: u[0], qty, grams, n });
  }
  return { ...t, parts };
}

/* Las mejores ideas para la próxima comida.
   ctx: { hour, remainingKcal, proteinGap (g que faltan), avoidText, dayKcalTarget, recentIdeaIds } */
export function suggest(ctx, limit = 3) {
  const meal = ctx.meal || nextMeal(ctx.hour);
  const avoid = norm(ctx.avoidText || '');
  const STOP = ['para', 'poco', 'mucho', 'nada', 'algo', 'muy', 'sin', 'con', 'los', 'las', 'del', 'que'];
  const words = avoid.split(' ').filter(w => w.length >= 4 && !STOP.includes(w));
  const ok = idea => !idea.tags.some(t => avoid.includes(norm(t)))
    && !words.some(w => norm(idea.name).includes(w));
  // cuánto «debería» ser esta comida: su parte del día, sin pasar de lo que queda
  const share = (ctx.dayKcalTarget || 2000) * MEAL_SHARE[meal];
  const aim = ctx.remainingKcal != null ? Math.max(120, Math.min(share * 1.15, ctx.remainingKcal)) : share;
  const scored = IDEAS.filter(i => i.meal === meal && ok(i)).map(i => {
    const n = ideaNutrients(i);
    let score = -Math.abs(n.kcal - aim) / aim;                // cerca de lo que toca
    if (ctx.remainingKcal != null && n.kcal > ctx.remainingKcal + 80) score -= 1;   // te pasarías
    if (ctx.proteinGap > 20) score += Math.min(0.6, n.p / 60);                      // vas corto de proteína
    if ((ctx.recentIdeaIds || []).includes(i.id)) score -= 0.15;                    // variar
    return { idea: i, n, score };
  }).sort((a, b) => b.score - a.score);
  return { meal, aim, items: scored.slice(0, limit) };
}

export { IDEAS };
