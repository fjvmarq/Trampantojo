/* Trampantojo — «Voy a comer fuera».

   Fuera de casa es donde más se come sin darse cuenta: raciones grandes,
   aceite que no se ve, pan que se va solo. Aquí, para cada sitio típico, lo
   que conviene pedir, lo que va mejor con medida y lo que más engorda sin
   alimentar, con sus calorías (de la misma tabla que todo lo demás; en un
   restaurante varían mucho según la mano con el aceite: son orientativas) y
   unos trucos para pedir. El semáforo sale de calidad.js, no de aquí. */

import { FOODS_BY_ID, nutrientsFor } from './foods.js?v=0.12.1';
import { foodQuality } from './calidad.js?v=0.12.1';

// [id de la tabla, ración, cantidad, qué decir]
export const PLACES = [
  {
    id: 'menu', label: 'Menú del día',
    intro: 'Puede ser de lo mejor o de lo peor que comas en la semana. La fórmula: de primero, cuchara o verdura; de segundo, algo a la plancha; y fruta de postre.',
    items: [
      ['ensalada-mixta', 'plato', 1, 'De primero: ensalada completa'],
      ['lentejas', 'plato', 1, 'o legumbre de cuchara'],
      ['gazpacho', 'vaso', 1, 'o gazpacho, en verano'],
      ['merluza', 'filete', 1, 'De segundo: pescado a la plancha'],
      ['pollo-plancha', 'filete', 1, 'o pollo a la plancha'],
      ['verduras-plancha', 'plato', 0.5, 'Guarnición de verdura, no de patatas'],
      ['manzana', 'pieza', 1, 'De postre, fruta'],
      ['pan-blanco', 'rebanada', 1, 'Una rebanada de pan, no la cesta'],
      ['macarrones-chorizo', 'plato', 1, 'Pasta con embutido: harina refinada y grasa saturada'],
      ['patatas-fritas', 'ración', 1, 'La guarnición frita'],
      ['flan', 'unidad', 1, 'El postre casero: casi todo azúcar'],
      ['vino', 'copa', 2, 'Dos copas de vino'],
    ],
    tips: ['Pide agua nada más sentarte y que se lleven la cesta de pan.', '«La guarnición, de ensalada o verdura, por favor»: casi siempre se puede.', 'Si el segundo viene frito o rebozado, cámbialo por algo a la plancha.'],
  },
  {
    id: 'tapas', label: 'Bar de tapas',
    intro: 'De tapas se come mucho más de lo que parece: cada ración suma, y las más ricas suelen ser fritas. Elige de mar y de plancha, y compartid.',
    items: [
      ['pulpo', 'ración', 0.5, 'Media de pulpo a la gallega'],
      ['gambas', 'ración', 1, 'Gambas o langostinos cocidos'],
      ['boquerones', 'ración', 1, 'Boquerones en vinagre'],
      ['mejillones', 'ración', 1, 'Mejillones al vapor'],
      ['aceitunas', 'ración', 1, 'Unas aceitunas: grasa buena, aunque con sal'],
      ['jamon-serrano', 'loncha', 4, 'Jamón: buena proteína, pero curado y salado'],
      ['tortilla-patatas', 'pincho', 1, 'Un pincho de tortilla'],
      ['cerveza-sin', 'caña', 1, 'La caña, mejor sin alcohol'],
      ['bravas', 'ración', 1, 'Bravas: patata frita con salsa'],
      ['croquetas', 'unidad', 4, 'Cuatro croquetas: bechamel frita'],
      ['calamares', 'ración', 1, 'Calamares a la romana: rebozado'],
      ['cerveza', 'caña', 2, 'Dos cañas'],
    ],
    tips: ['Pedid raciones para el centro y medias raciones: se come con la vista.', 'Por cada frito, una de marisco o de plancha.', 'Alterna cada caña con agua o una sin alcohol.'],
  },
  {
    id: 'pizza', label: 'Pizzería',
    intro: 'Una pizza entera pasa fácil de las 1.000 kcal, casi todas de harina blanca, queso y embutido. No hace falta renunciar: ensalada primero y dos porciones.',
    items: [
      ['ensalada-mixta', 'plato', 1, 'Empieza por una ensalada: llena y frena'],
      ['agua', 'vaso', 2, 'Agua (o con gas y limón)'],
      ['mozzarella', 'ración', 1, 'Caprese: mozzarella con tomate'],
      ['pizza', 'porción', 2, 'Dos porciones, y el resto para llevar'],
      ['lasana', 'ración', 1, 'Lasaña: pasta, bechamel y queso'],
      ['refresco', 'lata', 1, 'Un refresco con azúcar'],
      ['helado', 'bola', 2, 'Helado de postre'],
    ],
    tips: ['Mejor pizza fina y de verduras que de cuatro quesos o barbacoa.', 'Compartid la pizza y pedid una ensalada grande para el centro.'],
  },
  {
    id: 'burger', label: 'Hamburguesería',
    intro: 'Lo que más suma no es la carne, sino todo lo de alrededor: pan dulce, salsas, patatas y refresco. Quítale acompañantes y el menú se queda en la mitad.',
    items: [
      ['ensalada-verde', 'plato', 1, 'Cambia las patatas por ensalada'],
      ['agua', 'vaso', 2, 'Agua'],
      ['hamburguesa-casera', 'unidad', 1, 'Sólo la carne, o sin la mitad del pan'],
      ['refresco-zero', 'lata', 1, 'Si quieres refresco, sin azúcar'],
      ['hamburguesa-completa', 'unidad', 1, 'La completa, con pan y salsas'],
      ['patatas-fritas', 'ración', 1, 'Las patatas'],
      ['refresco', 'lata', 1, 'El refresco del menú'],
      ['helado', 'bola', 2, 'El postre'],
    ],
    tips: ['Pide la sencilla, no la doble ni la de bacon.', 'Sin salsas, o aparte: una de mayonesa son 100 kcal.'],
  },
  {
    id: 'japones', label: 'Japonés',
    intro: 'Parece lo más sano, y puede serlo: pescado crudo, soja, sopa. Lo que engaña es el arroz del sushi (lleva azúcar) y la tempura.',
    items: [
      ['edamame', 'ración', 1, 'Edamame para empezar'],
      ['salmon', 'filete', 0.7, 'Sashimi: el pescado, sin arroz'],
      ['sopa', 'plato', 0.5, 'Sopa de miso'],
      ['sushi', 'pieza', 8, 'Unas ocho piezas de sushi'],
      ['calamares', 'ración', 1, 'Tempura o rebozados'],
      ['refresco', 'lata', 1, 'Un refresco con azúcar'],
    ],
    tips: ['Más sashimi y menos maki: el pescado sacia, el arroz no tanto.', 'La salsa de soja, poca: es casi toda sal.'],
  },
  {
    id: 'kebab', label: 'Kebab',
    intro: 'Un dürüm entero se acerca a las 900 kcal. La misma carne en plato con ensalada y sin pan es otra cosa.',
    items: [
      ['ensalada-mixta', 'plato', 1, 'Plato de ensalada con la carne encima'],
      ['pollo-plancha', 'filete', 1, 'Si lo hay, pollo a la plancha'],
      ['agua', 'vaso', 2, 'Agua'],
      ['kebab', 'unidad', 1, 'El dürüm o el pan de pita entero'],
      ['patatas-fritas', 'ración', 1, 'Las patatas'],
      ['refresco', 'lata', 1, 'Un refresco'],
    ],
    tips: ['Pide la carne de pollo, mejor que la mixta.', 'La salsa de yogur, aparte y poca.'],
  },
];

export const GROUPS = [
  { q: 'b', title: 'Pide esto' },
  { q: 'r', title: 'Con medida' },
  { q: 'm', title: 'Lo que más engorda sin alimentar' },
];

// Lo de un sitio, con sus calorías y su semáforo, repartido por grupos.
export function placeView(place) {
  const rows = place.items.map(([id, unit, qty, note]) => {
    const food = FOODS_BY_ID.get(id);
    if (!food) return null;
    const u = food.u.find(([n]) => n === unit) || food.u[0];
    const grams = u[1] * qty;
    const n = nutrientsFor(food, grams);
    const quality = foodQuality(food) || { q: 'r', tags: [] };
    return { food, unit: u[0], qty, grams, note, kcal: Math.round(n.kcal), p: Math.round(n.p), q: quality.q, tags: quality.tags };
  }).filter(Boolean);
  return GROUPS.map(g => ({ ...g, rows: rows.filter(r => r.q === g.q) })).filter(g => g.rows.length);
}
