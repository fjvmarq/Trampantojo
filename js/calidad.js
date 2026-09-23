/* Trampantojo — qué TIPO de calorías son.

   Cien calorías de almendras y cien de gominolas no son lo mismo: las primeras
   traen grasa buena, fibra y proteína y te sacian; las segundas son azúcar que
   sube, baja y vuelve a pedir. Por eso cada alimento lleva aquí un semáforo:

     b · buenas          comida de verdad: verdura, fruta, legumbre, integral,
                         huevo, pescado, carne magra, lácteo natural, aceite de
                         oliva, frutos secos.
     r · con moderación  no es veneno, pero alimenta menos de lo que pesa:
                         harinas refinadas, queso curado, carne grasa, embutido
                         magro, zumo, miel.
     m · a evitar        las que no te alimentan y además empujan a la grasa
                         que peor sienta: azúcar añadido, bollería, fritos,
                         embutido graso, ultraprocesados, alcohol.

   y unas etiquetas que dicen POR QUÉ, cada una con su explicación y la parte
   del cuerpo en la que se nota. Todo es divulgación general, no consejo
   médico, y está escrito para no exagerar: la grasa no va «al sitio» del
   alimento que la trae; lo que sí hay son alimentos que empujan hacia la grasa
   más peligrosa (la de la barriga y la del hígado). */

/* ── los tipos de calorías ──────────────────────────────────────────── */

// zone: dónde se nota (cabeza, pecho, higado, abdomen, brazos, piernas);
// tone: bad (rojo), meh (ámbar) o good (verde)
export const TYPES = {
  azucar: {
    label: 'Azúcar añadido', tone: 'bad',
    text: 'El azúcar de mesa es mitad glucosa y mitad fructosa. La glucosa sube deprisa en sangre y dispara la insulina, la hormona que ordena guardar: lo que no gastas se almacena como grasa. La fructosa sólo la procesa el hígado, y cuando le llega mucha de golpe la convierte en grasa allí mismo. Por eso el exceso de azúcar se asocia al hígado graso y a la grasa de la barriga. Y no sacia: al rato vuelves a tener hambre.',
    zones: [['higado', 'Hígado: la fructosa que sobra se convierte en grasa aquí'], ['abdomen', 'Barriga: favorece la grasa visceral, la que rodea los órganos']],
  },
  refinado: {
    label: 'Harina refinada', tone: 'meh',
    text: 'Al refinar el grano se le quita la cáscara, y con ella la fibra. Sin fibra, el almidón se digiere en minutos y llega a la sangre casi como el azúcar: sube, baja de golpe y a las dos horas vuelve el hambre. No es veneno, pero sacia poco para lo que aporta. Su versión integral te da lo mismo, con freno.',
    zones: [['abdomen', 'Barriga: comer mucho refinado se asocia a más grasa visceral']],
  },
  saturada: {
    label: 'Grasa saturada', tone: 'bad',
    text: 'Es la grasa sólida a temperatura ambiente: la de la mantequilla, el embutido, el queso curado, la carne grasa o el aceite de palma de la bollería. En exceso sube el colesterol LDL (el «malo»), que se va pegando a las paredes de las arterias y las estrecha con los años. No engorda más que otra grasa —todas tienen 9 kcal por gramo—: es que te cuida peor el corazón.',
    zones: [['pecho', 'Arterias: sube el colesterol LDL, que se deposita en ellas']],
  },
  frito: {
    label: 'Frito o rebozado', tone: 'bad',
    text: 'Al freír, el alimento se empapa de aceite: unas patatas pasan de 87 kcal a más de 300 por cada 100 g. Si el aceite se reutiliza o se quema, como suele pasar fuera de casa, se degrada y forma compuestos oxidados que tu cuerpo no quiere. En casa, con aceite de oliva limpio, es mejor; aun así, freír multiplica las calorías.',
    zones: [['pecho', 'Arterias: el aceite requemado es de lo peor para ellas']],
  },
  procesada: {
    label: 'Carne procesada', tone: 'bad',
    text: 'Embutidos, salchichas, bacon, fiambres: carne curada, salada o ahumada. Desde 2015 la agencia del cáncer de la OMS la clasifica en su grupo 1, «cancerígeno para los humanos», por el cáncer de colon: no porque una loncha sea peligrosa, sino porque comerla a diario suma. Además lleva mucha sal y, casi siempre, grasa saturada.',
    zones: [['abdomen', 'Colon: comerla a diario aumenta el riesgo de cáncer de colon'], ['pecho', 'Arterias y tensión: sal y grasa saturada']],
  },
  alcohol: {
    label: 'Alcohol', tone: 'bad',
    text: 'El alcohol tiene 7 kcal por gramo, casi como la grasa, y ningún nutriente. Para tu cuerpo es un tóxico, así que lo quema antes que nada y mientras tanto deja de quemar grasa: lo que comes con la copa se guarda. El hígado, que es quien lo procesa, acaba acumulando grasa. Y encima quita el freno: con dos cañas se pica más.',
    zones: [['higado', 'Hígado: es quien lo procesa, y acumula grasa'], ['abdomen', 'Barriga: se asocia a más grasa abdominal'], ['cabeza', 'Cabeza: baja el freno y acabas picando más']],
  },
  sal: {
    label: 'Mucha sal', tone: 'meh',
    text: 'La sal no engorda, pero retiene líquido: al día siguiente la báscula puede marcar medio kilo o un kilo más de agua, no de grasa (se va sola en un par de días). A la larga, el exceso de sal sube la tensión. Y hace que cueste parar de comer.',
    zones: [['piernas', 'Retención de líquidos: medio kilo o uno de agua, no de grasa'], ['pecho', 'Tensión arterial: a la larga, la sube']],
  },
  ultra: {
    label: 'Ultraprocesado', tone: 'bad',
    text: 'Productos de fábrica con ingredientes que no tendrías en tu cocina: jarabes, aceites refinados, aromas, potenciadores. Están pensados para que la mezcla de azúcar, grasa y sal sea irresistible —en la naturaleza no se da junta— y se comen deprisa y sin freno. En un ensayo del NIH (2019), la gente comía unas 500 kcal más al día con ultraprocesados que con comida normal, sin darse cuenta.',
    zones: [['cabeza', 'Cerebro: diseñados para que no puedas parar'], ['abdomen', 'Barriga: se come más sin notarlo']],
  },
  liquido: {
    label: 'Calorías líquidas', tone: 'meh',
    text: 'Lo que se bebe no sacia: el cerebro apenas cuenta las calorías de un refresco, un zumo o una caña, y luego comes lo mismo que si no las hubieras tomado. Por eso son las más fáciles de sumar sin darte cuenta.',
    zones: [['cabeza', 'Cerebro: no las registra, así que no te quitan el hambre']],
  },
  fibra: {
    label: 'Fibra', tone: 'good',
    text: 'La fibra es la parte del vegetal que no digieres: frena la llegada del azúcar a la sangre, llena el estómago y alimenta a las bacterias buenas de tu intestino. Sacia mucho por muy pocas calorías.',
    zones: [['abdomen', 'Intestino: sacia y alimenta tus bacterias buenas']],
  },
  proteina: {
    label: 'Proteína', tone: 'good',
    text: 'Es lo que más sacia, y digerirla gasta más: de cada 100 kcal de proteína, tu cuerpo usa entre 20 y 30 sólo en procesarla (con la grasa, casi nada). Mientras adelgazas, protege tu músculo.',
    zones: [['brazos', 'Músculo: lo protege mientras adelgazas']],
  },
  'grasa-buena': {
    label: 'Grasa buena', tone: 'good',
    text: 'La del aceite de oliva, los frutos secos, el aguacate y el pescado azul (con omega-3): grasa insaturada. Baja el colesterol malo y cuida el corazón. Tiene las mismas 9 kcal por gramo que cualquier grasa, así que la cantidad cuenta, pero son de las calorías mejor invertidas.',
    zones: [['pecho', 'Corazón y arterias: baja el colesterol malo']],
  },
  integral: {
    label: 'Integral', tone: 'good',
    text: 'El grano entero, con su cáscara: la misma energía que el refinado, pero con fibra que la suelta poco a poco. Sacia más y no te deja con hambre a las dos horas.',
    zones: [['abdomen', 'Azúcar estable: la energía llega poco a poco']],
  },
  legumbre: {
    label: 'Legumbre', tone: 'good',
    text: 'Proteína y fibra a la vez, baratas y saciantes: de lo mejor que puedes comer para adelgazar. Su hidrato entra despacio.',
    zones: [['abdomen', 'Intestino: fibra que sacia horas'], ['brazos', 'Músculo: proteína vegetal']],
  },
  vitaminas: {
    label: 'Verdura o fruta', tone: 'good',
    text: 'Mucho volumen, agua, vitaminas y fibra por muy pocas calorías. Llenan el plato y el estómago; el azúcar de la fruta viene con su fibra, que lo frena.',
    zones: [['abdomen', 'Intestino: volumen y fibra que sacian']],
  },
  lacteo: {
    label: 'Lácteo natural', tone: 'good',
    text: 'Calcio y proteína, sin azúcar añadido. Mejor natural que de sabores: un yogur de sabores lleva el equivalente a dos o tres terrones.',
    zones: [['piernas', 'Huesos: calcio'], ['brazos', 'Músculo: proteína']],
  },
  cacao: {
    label: 'Cacao', tone: 'good',
    text: 'El cacao puro tiene flavanoles, antioxidantes buenos para las arterias. Cuanto más porcentaje de cacao, menos azúcar: el negro de 70 % o más es otra cosa que el chocolate con leche.',
    zones: [['pecho', 'Arterias: flavanoles antioxidantes']],
  },
};

export const QLABEL = { b: 'Calorías buenas', r: 'Con moderación', m: 'A evitar' };
export const QSHORT = { b: 'buenas', r: 'regulares', m: 'a evitar' };

/* ── la tabla: cada alimento con su semáforo y sus porqués ──────────── */
// 'clase etiqueta etiqueta…' — la primera etiqueta es la que más pesa
const Q = {
  // pan, cereales, pasta, arroz y patata
  'pan-blanco': 'r refinado', 'pan-integral': 'b integral fibra', 'pan-molde': 'r refinado ultra', biscote: 'r refinado',
  'tortita-arroz': 'r refinado', wrap: 'r refinado', 'arroz-cocido': 'r refinado', 'arroz-crudo': 'r refinado',
  'pasta-cocida': 'r refinado', 'pasta-cruda': 'r refinado', avena: 'b integral fibra', cereales: 'r refinado azucar ultra',
  'cereales-choco': 'm azucar refinado ultra', muesli: 'r integral azucar', quinoa: 'b integral fibra', cuscus: 'r refinado',
  'patata-cocida': 'b vitaminas', 'patatas-fritas': 'm frito', 'patatas-bolsa': 'm frito sal ultra', boniato: 'b vitaminas fibra',
  // legumbres
  lentejas: 'b legumbre fibra proteina', 'lentejas-chorizo': 'r legumbre procesada', garbanzos: 'b legumbre fibra',
  cocido: 'r legumbre procesada saturada', alubias: 'b legumbre fibra proteina', fabada: 'r legumbre procesada saturada',
  hummus: 'b legumbre grasa-buena', edamame: 'b legumbre proteina fibra', guisantes: 'b legumbre fibra',
  // verduras
  'ensalada-verde': 'b vitaminas fibra', 'ensalada-mixta': 'b vitaminas proteina', tomate: 'b vitaminas', lechuga: 'b vitaminas fibra',
  zanahoria: 'b vitaminas fibra', pepino: 'b vitaminas', pimiento: 'b vitaminas', cebolla: 'b vitaminas', calabacin: 'b vitaminas',
  berenjena: 'b vitaminas fibra', brocoli: 'b vitaminas fibra', coliflor: 'b vitaminas fibra', 'judias-verdes': 'b vitaminas fibra',
  espinacas: 'b vitaminas fibra', champinones: 'b vitaminas', 'verduras-plancha': 'b vitaminas grasa-buena', menestra: 'b vitaminas fibra',
  pisto: 'b vitaminas grasa-buena', gazpacho: 'b vitaminas grasa-buena', salmorejo: 'b vitaminas grasa-buena', 'crema-verduras': 'b vitaminas fibra',
  aguacate: 'b grasa-buena fibra', aceitunas: 'b grasa-buena sal', maiz: 'b vitaminas fibra',
  // fruta
  manzana: 'b vitaminas fibra', pera: 'b vitaminas fibra', platano: 'b vitaminas fibra', naranja: 'b vitaminas fibra',
  mandarina: 'b vitaminas fibra', fresas: 'b vitaminas fibra', uvas: 'b vitaminas', melon: 'b vitaminas', sandia: 'b vitaminas',
  melocoton: 'b vitaminas fibra', kiwi: 'b vitaminas fibra', pina: 'b vitaminas', mango: 'b vitaminas fibra', cerezas: 'b vitaminas',
  arandanos: 'b vitaminas fibra', datiles: 'b vitaminas fibra', pasas: 'b vitaminas fibra',
  'zumo-naranja': 'r liquido', 'zumo-envasado': 'r liquido',
  // lácteos
  'leche-entera': 'b lacteo', 'leche-semi': 'b lacteo', 'leche-desnatada': 'b lacteo proteina', 'bebida-avena': 'r liquido',
  'bebida-soja': 'b proteina', 'yogur-natural': 'b lacteo', 'yogur-desnatado': 'b lacteo proteina', 'yogur-azucarado': 'r azucar',
  'yogur-griego': 'b lacteo', skyr: 'b proteina lacteo', 'queso-fresco': 'b proteina lacteo', 'queso-batido': 'b proteina lacteo',
  'queso-curado': 'r saturada sal proteina', 'queso-semi': 'r saturada sal proteina', 'queso-lonchas': 'r saturada sal ultra',
  mozzarella: 'r saturada proteina', 'queso-rallado': 'r saturada sal', nata: 'r saturada', mantequilla: 'r saturada',
  natillas: 'm azucar', flan: 'm azucar', helado: 'm azucar saturada', 'batido-cacao': 'm azucar liquido',
  // huevos
  huevo: 'b proteina', 'huevo-frito': 'r frito proteina', 'tortilla-francesa': 'b proteina', 'tortilla-patatas': 'r frito',
  revuelto: 'b proteina',
  // carne y embutido
  'pollo-plancha': 'b proteina', 'pollo-asado': 'b proteina', 'pavo-plancha': 'b proteina', 'fiambre-pavo': 'r procesada proteina',
  'jamon-york': 'r procesada proteina', 'jamon-serrano': 'r procesada sal proteina', 'jamon-iberico': 'r procesada sal proteina',
  chorizo: 'm procesada saturada sal', salchichon: 'm procesada saturada sal', 'lomo-embuchado': 'r procesada sal proteina',
  'ternera-plancha': 'b proteina', 'ternera-guisada': 'b proteina', 'hamburguesa-casera': 'r saturada proteina', 'lomo-cerdo': 'b proteina',
  costillas: 'r saturada', secreto: 'r saturada', salchichas: 'm procesada saturada ultra', albondigas: 'r saturada',
  nuggets: 'm frito ultra', cordero: 'r saturada proteina', conejo: 'b proteina',
  // pescado y marisco
  merluza: 'b proteina', 'merluza-rebozada': 'r frito', salmon: 'b proteina grasa-buena', 'atun-aceite': 'b proteina grasa-buena',
  'atun-natural': 'b proteina', 'sardinas-lata': 'b proteina grasa-buena', bacalao: 'b proteina', dorada: 'b proteina',
  gambas: 'b proteina', 'gambas-ajillo': 'b proteina grasa-buena', calamares: 'r frito', pulpo: 'b proteina grasa-buena',
  mejillones: 'b proteina', surimi: 'r ultra', boquerones: 'b proteina grasa-buena',
  // platos y tapas
  paella: 'r refinado', croquetas: 'm frito saturada', empanadilla: 'm frito refinado', empanada: 'r refinado',
  pizza: 'm refinado saturada sal', lasana: 'r refinado saturada', 'macarrones-chorizo': 'r refinado procesada',
  carbonara: 'r refinado saturada', bolonesa: 'r refinado', sopa: 'b vitaminas', bravas: 'm frito', ensaladilla: 'r ultra',
  'bocadillo-jamon': 'r refinado procesada', 'bocadillo-tortilla': 'r refinado', 'sandwich-mixto': 'r refinado procesada saturada',
  'hamburguesa-completa': 'm refinado saturada ultra', kebab: 'm saturada refinado', sushi: 'r refinado', burrito: 'r refinado',
  churros: 'm frito refinado', 'chocolate-taza': 'm azucar',
  // dulces, picoteo y frutos secos
  'chocolate-negro': 'r cacao azucar', 'chocolate-leche': 'm azucar saturada', 'galletas-maria': 'm azucar refinado',
  'galletas-choco': 'm azucar refinado saturada ultra', 'galletas-digestive': 'm azucar refinado saturada', magdalena: 'm azucar refinado',
  croissant: 'm refinado saturada', napolitana: 'm azucar refinado saturada ultra', donut: 'm azucar frito refinado ultra',
  bizcocho: 'm azucar refinado', tarta: 'm azucar saturada', gominolas: 'm azucar ultra',
  almendras: 'b grasa-buena fibra proteina', nueces: 'b grasa-buena fibra', cacahuetes: 'b grasa-buena proteina',
  pistachos: 'b grasa-buena fibra proteina', 'frutos-secos': 'b grasa-buena fibra', palomitas: 'r saturada sal ultra',
  azucar: 'm azucar', miel: 'r azucar', mermelada: 'r azucar', 'crema-cacao': 'm azucar saturada ultra',
  'crema-cacahuete': 'b grasa-buena proteina', barrita: 'm azucar ultra',
  // grasas y salsas
  aceite: 'b grasa-buena', mayonesa: 'r ultra', ketchup: 'r azucar ultra', 'tomate-frito': 'r azucar', mostaza: 'b', 'soja-salsa': 'r sal',
  // bebidas
  'cafe-solo': 'b', 'cafe-leche': 'b lacteo', colacao: 'r azucar liquido', refresco: 'm azucar liquido', 'refresco-zero': 'r ultra',
  cerveza: 'm alcohol liquido', 'cerveza-sin': 'r liquido', vino: 'm alcohol liquido', 'tinto-verano': 'm alcohol azucar liquido',
  vermut: 'm alcohol azucar', cubata: 'm alcohol azucar liquido', licor: 'm alcohol', isotonica: 'r azucar liquido',
  infusion: 'b', agua: 'b',
};

function parse(code) {
  const [q, ...tags] = code.split(' ');
  return { q, tags };
}

export const QUALITY_IDS = Object.keys(Q);

// El semáforo de un alimento de la tabla (o de un producto escaneado que ya lo traiga).
export function foodQuality(item) {
  if (!item) return null;
  if (item.q) return { q: item.q, tags: item.qt || [] };
  const code = Q[item.id];
  return code ? parse(code) : null;
}

/* Un producto de Open Food Facts: con su Nutri-Score, su grupo NOVA
   (4 = ultraprocesado) y sus nutrientes por 100 g. */
export function productQuality({ nova, nutriscore, sugars, satFat, salt, fiber, protein, kcal } = {}) {
  const tags = [];
  if (sugars >= 15) tags.push('azucar');
  if (satFat >= 5) tags.push('saturada');
  if (salt >= 1.5) tags.push('sal');
  if (nova === 4) tags.push('ultra');
  if (fiber >= 6) tags.push('fibra');
  if (kcal > 0 && protein * 4 / kcal >= 0.25) tags.push('proteina');
  const grade = String(nutriscore || '').toLowerCase();
  let q;
  if (grade === 'e' || (grade === 'd' && nova === 4)) q = 'm';
  else if ((grade === 'a' || grade === 'b') && nova !== 4) q = 'b';
  else if (grade) q = 'r';
  else {
    // sin Nutri-Score: lo que dicen sus nutrientes
    const bad = tags.filter(t => ['azucar', 'saturada', 'ultra'].includes(t)).length;
    q = bad >= 2 ? 'm' : bad === 1 || tags.includes('sal') ? 'r' : tags.length ? 'b' : null;
  }
  return q ? { q, tags } : null;
}

/* El semáforo de un apunte. Los platos guardados llevan la mezcla de sus
   ingredientes (qmix: fracción de kcal buenas, regulares y a evitar). */
export function entryQuality(entry, state) {
  if (entry.q) return { q: entry.q, tags: entry.qt || [] };
  if (entry.src === 'tabla') {
    const code = Q[entry.ref];
    return code ? parse(code) : null;
  }
  if (entry.src === 'producto') {
    const pr = state?.products?.[entry.ref];
    return pr?.q ? { q: pr.q, tags: pr.qt || [] } : null;
  }
  if (entry.src === 'plato') {
    const d = (state?.dishes || []).find(x => x.id === entry.ref);
    if (d?.qmix) return { mix: d.qmix, q: majority(d.qmix), tags: [] };
  }
  return null;
}

function majority(mix) {
  return ['b', 'r', 'm'].reduce((a, k) => ((mix[k] || 0) > (mix[a] || 0) ? k : a), 'b');
}

// La mezcla de calidad de una lista de apuntes (para guardar un plato, o para el día).
export function qualityMix(entries = [], state) {
  const kcal = { b: 0, r: 0, m: 0, sin: 0 };
  let worst = null;
  for (const e of entries) {
    const k = e.kcal || 0;
    const qe = entryQuality(e, state);
    if (!qe) { kcal.sin += k; continue; }
    if (qe.mix) { for (const c of ['b', 'r', 'm']) kcal[c] += k * (qe.mix[c] || 0); }
    else kcal[qe.q] += k;
    if (qe.q === 'm' && !qe.mix && (!worst || k > worst.kcal)) worst = { entry: e, kcal: k, tags: qe.tags };
  }
  const known = kcal.b + kcal.r + kcal.m;
  const pct = c => (known ? kcal[c] / known : 0);
  return { kcal, known, total: known + kcal.sin, pct: { b: pct('b'), r: pct('r'), m: pct('m') }, worst };
}

// Partes del cuerpo afectadas, juntando lo de cada etiqueta (lo malo primero).
export function bodyZones(tags = []) {
  const order = { bad: 0, meh: 1, good: 2 };
  const out = [];
  for (const t of tags) {
    const type = TYPES[t];
    if (!type) continue;
    for (const [zone, text] of type.zones || []) out.push({ zone, text, tone: type.tone, tag: t });
  }
  // una línea por parte del cuerpo: «Barriga» lo dicen el azúcar, el refinado y el
  // ultraprocesado; se queda la primera (la peor, y de la etiqueta que más pesa)
  const seen = new Set();
  return out.sort((a, b) => order[a.tone] - order[b.tone]).filter(z => {
    const head = z.text.split(':')[0];
    if (seen.has(head)) return false;
    seen.add(head);
    return true;
  });
}

// «Grasa buena · fibra»: las etiquetas en una línea.
export function tagLine(tags = [], max = 3) {
  return tags.slice(0, max).map((t, i) => (i ? TYPES[t]?.label.toLowerCase() : TYPES[t]?.label)).filter(Boolean).join(' · ');
}
