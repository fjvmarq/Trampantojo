/* Trampantojo — la pantalla de Comidas.

   Apuntar tiene que costar segundos: por eso lo primero son tus recientes y tus
   platos, la búsqueda entiende frases («2 huevos y una tostada») y cada
   alimento trae sus raciones caseras. Lo envasado, por su código de barras
   (Open Food Facts, gratis; sólo sale del móvil el número del código).

   Cada apunte guarda sus calorías y nutrientes CALCULADOS en el momento: si la
   tabla cambia en una versión futura, lo que comiste ayer no cambia. */

import { FOODS_BY_ID, searchFoods, parsePhrase, stripQty, nutrientsFor, norm } from './foods.js?v=0.12.0';
import { kg1 } from './charts.js?v=0.12.0';
import { suggest, HOW } from './ideas.js?v=0.12.0';
import { foodQuality, entryQuality, productQuality, qualityMix, tagLine, TYPES, QLABEL, QSHORT } from './calidad.js?v=0.12.0';
import { SLOTS, buildMenu, pickFor, mealNutrients, dayTotal, factorText, shoppingList, shoppingText } from './menu.js?v=0.12.0';
import { PLACES, placeView } from './fuera.js?v=0.12.0';

export const MEALS = [
  { id: 'desayuno', label: 'Desayuno' },
  { id: 'media', label: 'Media mañana' },
  { id: 'comida', label: 'Comida' },
  { id: 'merienda', label: 'Merienda' },
  { id: 'cena', label: 'Cena' },
  { id: 'picoteo', label: 'Picoteo' },
];

export function mealForNow(d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h < 11) return 'desayuno';
  if (h < 13) return 'media';
  if (h < 16.5) return 'comida';
  if (h < 19.5) return 'merienda';
  if (h < 23) return 'cena';
  return 'picoteo';
}

const $ = (sel, root = document) => root.querySelector(sel);
let intFmt;
try { intFmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' }); }
catch { intFmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }); }
const int = v => intFmt.format(Math.round(v));
const round10 = v => Math.round(v / 10) * 10;   // el objetivo, como en Hoy
const qtyFmt = v => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(v);
const newId = p => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Lo que suma un día: kcal, proteína, hidratos y grasa.
export function dayTotals(entries = []) {
  return entries.reduce((t, e) => ({ kcal: t.kcal + e.kcal, p: t.p + e.p, c: t.c + e.c, f: t.f + e.f }), { kcal: 0, p: 0, c: 0, f: 0 });
}

// El plural de una ración: rebanada → rebanadas, unidad → unidades, ración → raciones.
export function plural(w) {
  if (w.includes(' ') || /s$/.test(w)) return w;
  if (/[aeiouáéíóú]$/.test(w)) return w + 's';
  if (/z$/.test(w)) return w.slice(0, -1) + 'ces';
  if (/ón$/.test(w)) return w.slice(0, -2) + 'ones';
  return w + 'es';
}

// «2 rebanadas», «1 plato», «½ ración», «150 g»
export function portionText(e) {
  if (e.unit === 'g') return `${int(e.grams)} g`;
  if (e.unit === 'kcal') return 'a mano';
  if (e.qty === 0.5) return `media ${e.unit}`.replace(/^media (plato|vaso|bol|trozo|filete|tercio|taco|puñado|pincho|chupito|racimo|brick|medio|sobre|panecillo)/, 'medio $1');
  const q = e.qty === 1 ? '1' : qtyFmt(e.qty);
  return `${q} ${e.qty > 1 ? plural(e.unit) : e.unit}`;
}

export function initComidas(ctx) {
  const { getState, persist, toast, today, render } = ctx;
  let day = null;            // el día que se está viendo (null = hoy)
  let targetMeal = 'desayuno';
  let editing = null;        // { date, id } cuando se corrige un apunte
  let chosen = null;         // { item, unit, qty } en la vista de ración
  let scanStream = null, scanTimer = null;

  const dlg = $('#food-dialog');
  const views = ['search', 'portion', 'scan', 'manual'];
  const showView = v => views.forEach(n => { $(`#food-${n}-view`).hidden = n !== v; });

  const viewDay = () => day || today();

  /* ── lo tuyo primero: platos, productos escaneados y recientes ──── */

  function extras() {
    const st = getState();
    const dishes = (st.dishes || []).map(d => ({ id: d.id, n: d.name, a: [], k: d.k, p: d.p, c: d.c, f: d.f, u: [['ración', d.grams || 100]], src: 'plato', ...dishQ(d) }));
    const products = Object.values(st.products || {}).map(pr => ({ id: pr.code, n: pr.name, a: pr.brand ? [pr.brand] : [], k: pr.k, p: pr.p, c: pr.c, f: pr.f, u: pr.u, src: 'producto', q: pr.q, qt: pr.qt }));
    return [...dishes, ...products];
  }

  // un plato guardado: su semáforo es el de la mayoría de sus calorías
  function dishQ(d) {
    if (!d.qmix) return {};
    const q = ['b', 'r', 'm'].reduce((a, k) => ((d.qmix[k] || 0) > (d.qmix[a] || 0) ? k : a), 'b');
    return { q, qt: [] };
  }

  function itemFromRef(src, ref) {
    const st = getState();
    if (src === 'tabla') { const f = FOODS_BY_ID.get(ref); return f ? { ...f, src } : null; }
    if (src === 'plato') { const d = (st.dishes || []).find(x => x.id === ref); return d ? { id: d.id, n: d.name, a: [], k: d.k, p: d.p, c: d.c, f: d.f, u: [['ración', d.grams || 100]], src, ...dishQ(d) } : null; }
    if (src === 'producto') { const pr = st.products?.[ref]; return pr ? { id: pr.code, n: pr.name, a: [], k: pr.k, p: pr.p, c: pr.c, f: pr.f, u: pr.u, src, q: pr.q, qt: pr.qt } : null; }
    return null;
  }

  function recentItems() {
    const st = getState();
    return (st.recentFoods || []).map(r => {
      const item = itemFromRef(r.src, r.ref);
      return item ? { item, unit: r.unit, qty: r.qty } : null;
    }).filter(Boolean).slice(0, 12);
  }

  function remember(item, unit, qty) {
    const st = getState();
    const list = (st.recentFoods || []).filter(r => !(r.src === item.src && r.ref === item.id));
    list.unshift({ src: item.src, ref: item.id, unit, qty });
    st.recentFoods = list.slice(0, 30);
  }

  /* ── apuntar ─────────────────────────────────────────────────────── */

  function entryFor(item, unit, qty) {
    const u = (item.u || []).find(([n]) => n === unit);
    const grams = unit === 'g' ? qty : (u ? u[1] : 100) * qty;
    const n = nutrientsFor(item, grams);
    return {
      name: item.n, unit, qty: unit === 'g' ? 1 : qty, grams,
      kcal: Math.round(n.kcal), p: Math.round(n.p * 10) / 10, c: Math.round(n.c * 10) / 10, f: Math.round(n.f * 10) / 10,
      src: item.src || 'tabla', ref: item.id,
    };
  }

  function addEntries(list, msg) {
    const st = getState();
    const date = viewDay();
    st.food = st.food || {};
    const arr = st.food[date] || (st.food[date] = []);
    list.forEach(e => arr.push({ id: newId('c'), meal: targetMeal, t: Date.now(), ...e }));
    if (persist(msg)) { dlg.close(); render(); }
  }

  /* ── la hoja: buscar ─────────────────────────────────────────────── */

  function openAdd(meal) {
    targetMeal = meal;
    editing = null;
    $('#food-title').textContent = `Añadir a ${MEALS.find(m => m.id === meal).label.toLowerCase()}`;
    $('#food-q').value = '';
    showView('search');
    renderResults();
    dlg.showModal();
    setTimeout(() => $('#food-q').focus(), 60);
  }

  function resultRow(label, sub, kcalText, onClick, q) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'log-row';
    const main = document.createElement('span'); main.className = 'log-main';
    const t = document.createElement('span'); t.className = 'log-date';
    if (q) {
      const dot = document.createElement('span'); dot.className = `qdot q-${q}`;
      dot.setAttribute('role', 'img'); dot.setAttribute('aria-label', QLABEL[q]);
      t.appendChild(dot);
    }
    t.appendChild(document.createTextNode(label));
    main.appendChild(t);
    if (sub) { const s = document.createElement('span'); s.className = 'log-sub'; s.textContent = sub; main.appendChild(s); }
    const side = document.createElement('span'); side.className = 'log-side';
    const k = document.createElement('span'); k.className = 'log-change'; k.textContent = kcalText;
    side.appendChild(k);
    const chev = document.createElement('span'); chev.className = 'chev'; chev.setAttribute('aria-hidden', 'true');
    b.append(main, side, chev);
    b.addEventListener('click', onClick);
    li.appendChild(b);
    return li;
  }

  const srcLabel = { plato: 'tu plato', producto: 'escaneado', tabla: '' };

  function renderResults() {
    const q = $('#food-q').value.trim();
    const list = $('#food-results');
    const label = $('#food-list-label');
    const phrase = $('#food-phrase');
    list.replaceChildren();
    phrase.hidden = true;

    if (!q) {
      const rec = recentItems();
      label.textContent = rec.length ? 'Recientes' : 'Ideas';
      const items = rec.length ? rec : ['cafe-leche', 'pan-blanco', 'aceite', 'yogur-natural', 'platano', 'pollo-plancha', 'ensalada-verde', 'arroz-cocido']
        .map(id => ({ item: { ...FOODS_BY_ID.get(id), src: 'tabla' }, unit: FOODS_BY_ID.get(id).u[0][0], qty: 1 }));
      items.forEach(({ item, unit, qty }) => {
        const e = entryFor(item, unit, qty);
        const fq = foodQuality(item);
        list.appendChild(resultRow(item.n, `${portionText(e)}${srcLabel[item.src] ? ' · ' + srcLabel[item.src] : ''}`, `${int(e.kcal)} kcal`, () => openPortion(item, unit, qty), fq?.q));
      });
      return;
    }

    // ¿es una frase con varias cosas o con cantidades?
    const parsed = parsePhrase(q, extras());
    const looksLikePhrase = parsed.parts.length > 1 || /^\s*(\d|un |una |dos |tres |medio |media )/i.test(q);
    if (looksLikePhrase && parsed.understood) {
      const entries = parsed.items.filter(Boolean).map(x => entryFor(x.item, x.unit, x.qty));
      const total = entries.reduce((a, e) => a + e.kcal, 0);
      phrase.replaceChildren();
      const title = document.createElement('p'); title.className = 'eyebrow'; title.textContent = 'He entendido';
      phrase.appendChild(title);
      parsed.items.forEach((x, i) => {
        const p = document.createElement('p');
        p.className = 'phrase-line';
        if (x) {
          const e = entryFor(x.item, x.unit, x.qty);
          p.textContent = `${portionText(e)} de ${x.item.n.toLowerCase()} · ${int(e.kcal)} kcal`;
        } else {
          p.classList.add('miss');
          p.textContent = `«${parsed.parts[i]}»: no lo encuentro, búscalo aparte`;
        }
        phrase.appendChild(p);
      });
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn primary block';
      b.textContent = `Añadir todo · ${int(total)} kcal`;
      b.addEventListener('click', () => {
        parsed.items.filter(Boolean).forEach(x => remember(x.item, x.unit, x.qty));
        addEntries(entries, `Añadido: ${int(total)} kcal`);
      });
      phrase.appendChild(b);
      phrase.hidden = false;
    }

    // los resultados, para lo último que se ha escrito (o lo que no se entendió)
    const missIdx = parsed.items.findIndex(x => !x);
    const focus = missIdx >= 0 ? parsed.parts[missIdx] : parsed.parts[parsed.parts.length - 1] || q;
    const found = searchFoods(stripQty(focus), extras(), 25);
    label.textContent = found.length ? 'Resultados' : 'Nada con ese nombre';
    found.forEach(item => {
      const unit = item.u?.[0]?.[0] || 'g';
      const e = entryFor(item, unit, unit === 'g' ? 100 : 1);
      const fq = foodQuality(item);
      const kind = fq?.tags?.length ? tagLine(fq.tags, 2) : `${int(item.k)} kcal/100 g`;
      list.appendChild(resultRow(item.n, `${portionText(e)}${srcLabel[item.src] ? ' · ' + srcLabel[item.src] : ''} · ${kind}`, `${int(e.kcal)} kcal`, () => openPortion(item, unit, 1), fq?.q));
    });
    if (!found.length) {
      list.appendChild(resultRow('Apuntarlo a mano', 'con sus calorías, si las sabes', '', () => openManual(q)));
    }
  }

  /* ── la hoja: ración ─────────────────────────────────────────────── */

  function openPortion(item, unit, qty, entry) {
    chosen = { item, unit, qty };
    showView('portion');
    $('#portion-name').textContent = item.n;
    $('#portion-per100').textContent = `${int(item.k)} kcal por 100 g · ${kg1(item.p)} g de proteína`;
    renderPortionQuality(item);
    const units = $('#portion-units');
    units.replaceChildren();
    [...(item.u || []), ['g', 1]].forEach(([n, g]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ghost small';
      b.textContent = n === 'g' ? 'en gramos' : /\d\s*g$/.test(n) ? n : `${n} (${int(g)} g)`;
      b.setAttribute('aria-pressed', String(n === unit));
      b.addEventListener('click', () => {
        const grams = chosen.unit === 'g' ? chosen.qty : ((item.u || []).find(([x]) => x === chosen.unit)?.[1] || 100) * chosen.qty;
        chosen.unit = n;
        chosen.qty = n === 'g' ? Math.round(grams) : 1;
        [...units.children].forEach(c => c.setAttribute('aria-pressed', String(c === b)));
        updatePortion();
      });
      units.appendChild(b);
    });
    $('#portion-add').textContent = entry ? 'Guardar' : 'Añadir';
    $('#portion-delete').hidden = !entry;
    updatePortion();
  }

  function renderPortionQuality(item) {
    const fq = foodQuality(item);
    const line = $('#portion-quality');
    const types = $('#portion-types');
    line.replaceChildren();
    types.replaceChildren();
    line.hidden = !fq;
    if (!fq) return;
    const chip = document.createElement('span'); chip.className = `qchip q-${fq.q}`; chip.textContent = QLABEL[fq.q];
    line.appendChild(chip);
    if (fq.tags.length) line.appendChild(document.createTextNode(` ${tagLine(fq.tags, 4)}`));
    fq.tags.forEach(t => {
      const type = TYPES[t];
      if (!type) return;
      const d = document.createElement('details');
      d.className = `type-item tone-${type.tone}`;
      const sum = document.createElement('summary');
      const dot = document.createElement('span'); dot.className = `tdot tone-${type.tone}`; dot.setAttribute('aria-hidden', 'true');
      sum.append(dot, document.createTextNode(`¿Por qué? ${type.label}`));
      const x = document.createElement('p'); x.className = 'message-text'; x.textContent = type.text;
      d.append(sum, x);
      types.appendChild(d);
    });
  }

  function updatePortion() {
    const { item, unit, qty } = chosen;
    $('#portion-qty').value = qtyFmt(qty);
    $('#portion-qty-label').textContent = unit === 'g' ? 'Gramos' : 'Cantidad';
    const e = entryFor(item, unit, qty);
    $('#portion-grams').textContent = unit === 'g' ? '' : `${int(e.grams)} g`;
    $('#portion-result').textContent = `${int(e.kcal)} kcal`;
    $('#portion-macros').textContent = `${kg1(e.p)} g proteína · ${kg1(e.c)} g hidratos · ${kg1(e.f)} g grasa`;
  }

  function stepQty(dir) {
    const { unit } = chosen;
    const step = unit === 'g' ? (chosen.qty >= 100 ? 25 : 10) : 0.5;
    chosen.qty = Math.max(unit === 'g' ? 5 : 0.5, Math.round((chosen.qty + dir * step) * 100) / 100);
    updatePortion();
  }

  $('#portion-minus').addEventListener('click', () => stepQty(-1));
  $('#portion-plus').addEventListener('click', () => stepQty(1));
  $('#portion-qty').addEventListener('input', e => {
    const v = Number(String(e.target.value).replace(',', '.'));
    if (v > 0) { chosen.qty = v; const x = entryFor(chosen.item, chosen.unit, v); $('#portion-result').textContent = `${int(x.kcal)} kcal`; $('#portion-grams').textContent = chosen.unit === 'g' ? '' : `${int(x.grams)} g`; }
  });

  $('#portion-add').addEventListener('click', () => {
    const { item, unit, qty } = chosen;
    const e = entryFor(item, unit, qty);
    remember(item, unit, qty);
    if (editing) {
      const st = getState();
      const arr = st.food[editing.date] || [];
      const i = arr.findIndex(x => x.id === editing.id);
      if (i >= 0) arr[i] = { ...arr[i], ...e };
      if (persist('Guardado.')) { dlg.close(); render(); }
      return;
    }
    addEntries([e], `${item.n}: ${int(e.kcal)} kcal`);
  });

  $('#portion-delete').addEventListener('click', () => {
    if (!editing) return;
    const st = getState();
    st.food[editing.date] = (st.food[editing.date] || []).filter(x => x.id !== editing.id);
    if (!st.food[editing.date].length) delete st.food[editing.date];
    if (persist('Quitado.')) { dlg.close(); render(); }
  });

  $('#portion-back').addEventListener('click', () => { if (editing) dlg.close(); else { showView('search'); renderResults(); } });

  /* ── la hoja: a mano ─────────────────────────────────────────────── */

  function openManual(name = '') {
    showView('manual');
    const f = $('#manual-form');
    f.reset();
    f.elements.name.value = name;
    setTimeout(() => f.elements.kcal.focus(), 60);
  }
  $('#food-manual').addEventListener('click', () => openManual($('#food-q').value.trim()));
  $('#manual-back').addEventListener('click', () => { showView('search'); renderResults(); });
  $('#manual-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.currentTarget;
    const kcal = Number(String(f.elements.kcal.value).replace(',', '.'));
    const p = Number(String(f.elements.p.value || '0').replace(',', '.'));
    const name = f.elements.name.value.trim() || 'Sin nombre';
    if (!(kcal > 0 && kcal < 5000)) { toast('Escribe las calorías, por ejemplo 350.', true); return; }
    addEntries([{ name, unit: 'kcal', qty: 1, grams: 0, kcal: Math.round(kcal), p: p > 0 ? p : 0, c: 0, f: 0, src: 'manual', ref: null }], `${name}: ${int(kcal)} kcal`);
  });

  /* ── la hoja: código de barras ───────────────────────────────────── */

  async function openScan() {
    showView('scan');
    $('#scan-code').value = '';
    const status = $('#scan-status');
    const video = $('#scan-video');
    stopScan();
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
      video.hidden = true;
      status.textContent = 'Este navegador no puede leer códigos con la cámara: escribe los números que hay debajo de las barras.';
      return;
    }
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      const detector = new window.BarcodeDetector({ formats: formats.filter(f => /ean|upc/.test(f)) });
      scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      video.srcObject = scanStream;
      video.hidden = false;
      await video.play();
      status.textContent = 'Apunta al código de barras del envase.';
      scanTimer = setInterval(async () => {
        try {
          const codes = await detector.detect(video);
          if (codes.length) { const code = codes[0].rawValue; stopScan(); $('#scan-code').value = code; lookup(code); }
        } catch { /* un fotograma sin código */ }
      }, 300);
    } catch (err) {
      video.hidden = true;
      status.textContent = 'No he podido abrir la cámara. Escribe los números del código.';
    }
  }

  function stopScan() {
    clearInterval(scanTimer); scanTimer = null;
    if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
  }

  // «Galletas (Gullón)», pero no «Nutella (Nutella)»
  function withBrand(name, brands) {
    const b = (brands || '').split(',')[0].trim();
    return b && !norm(name).includes(norm(b)) ? `${name} (${b})` : name;
  }

  async function lookup(code) {
    code = String(code).replace(/\D/g, '');
    const status = $('#scan-status');
    if (code.length < 8) { status.textContent = 'El código tiene al menos 8 números.'; return; }
    const st = getState();
    const known = st.products?.[code];
    if (known) { openPortion(itemFromRef('producto', code), known.u[0][0], 1); return; }
    if (!navigator.onLine) { status.textContent = 'Sin conexión no puedo buscar el producto. Prueba luego, o apúntalo a mano.'; return; }
    status.textContent = 'Buscando…';
    try {
      const fields = 'product_name,product_name_es,brands,nutriments,serving_quantity,nova_group,nutriscore_grade';
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${fields}`);
      const j = await res.json();
      const p = j.product;
      const n = p?.nutriments || {};
      let k = n['energy-kcal_100g'];
      if (k == null && n['energy_100g'] != null) k = n['energy_100g'] / 4.184;
      if (!p || k == null) { status.textContent = 'No encuentro ese producto (o no trae calorías). Apúntalo a mano con lo que pone la etiqueta.'; return; }
      const name = (p.product_name_es || p.product_name || 'Producto').trim();
      const units = [['100 g', 100]];
      if (Number(p.serving_quantity) > 0) units.unshift(['ración', Number(p.serving_quantity)]);
      st.products = st.products || {};
      const pq = productQuality({
        nova: Number(p.nova_group) || null, nutriscore: p.nutriscore_grade,
        sugars: Number(n.sugars_100g) || 0, satFat: Number(n['saturated-fat_100g']) || 0, salt: Number(n.salt_100g) || 0,
        fiber: Number(n.fiber_100g) || 0, protein: Number(n.proteins_100g) || 0, kcal: k,
      });
      st.products[code] = {
        code, name: withBrand(name, p.brands), brand: p.brands || '',
        k: Math.round(k), p: Number(n.proteins_100g) || 0, c: Number(n.carbohydrates_100g) || 0, f: Number(n.fat_100g) || 0, u: units,
        ...(pq ? { q: pq.q, qt: pq.tags } : {}),
      };
      persist();
      openPortion(itemFromRef('producto', code), units[0][0], 1);
    } catch {
      status.textContent = 'No he podido consultar Open Food Facts. Revisa la conexión o apúntalo a mano.';
    }
  }

  $('#food-scan').addEventListener('click', openScan);
  $('#scan-lookup').addEventListener('click', () => lookup($('#scan-code').value));
  $('#scan-back').addEventListener('click', () => { stopScan(); showView('search'); renderResults(); });

  /* ── la hoja: abrir, cerrar ──────────────────────────────────────── */

  $('#food-q').addEventListener('input', renderResults);
  $('#food-cancel').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', stopScan);
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  /* ── mis platos ──────────────────────────────────────────────────── */

  const ddlg = $('#dish-dialog');
  let dishFrom = null;

  function openSaveDish(meal) {
    dishFrom = meal;
    const f = $('#dish-form');
    f.reset();
    f.elements.servings.value = '1';
    ddlg.showModal();
    setTimeout(() => f.elements.name.focus(), 60);
  }
  $('#dish-cancel').addEventListener('click', () => ddlg.close());
  $('#dish-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.currentTarget;
    const name = f.elements.name.value.trim();
    const servings = Number(String(f.elements.servings.value).replace(',', '.'));
    if (!name) { toast('Ponle un nombre al plato.', true); return; }
    if (!(servings > 0 && servings < 50)) { toast('¿Para cuántas raciones es? Un número, por ejemplo 1 o 4.', true); return; }
    const st = getState();
    const items = (st.food[viewDay()] || []).filter(x => x.meal === dishFrom);
    const t = dayTotals(items);
    const grams = items.reduce((a, x) => a + (x.grams || 0), 0) / servings;
    const per = x => Math.round(x / servings * 10) / 10;
    // por 100 g si sabemos los gramos; si no, «1 ración = 100 g» para que la tabla funcione igual
    const g = grams > 0 ? grams : 100;
    const mix = qualityMix(items, st);
    st.dishes = [...(st.dishes || []), {
      id: newId('p'), name, grams: Math.round(g),
      k: Math.round(t.kcal / servings / g * 100), p: per(t.p) / g * 100, c: per(t.c) / g * 100, f: per(t.f) / g * 100,
      ...(mix.known ? { qmix: mix.pct } : {}),
    }];
    if (persist(`«${name}» guardado: la próxima vez es un toque.`)) { ddlg.close(); render(); }
  });

  /* ── pintar la pantalla ──────────────────────────────────────────── */

  function renderComidas(s) {
    const st = getState();
    const date = viewDay();
    const isToday = date === today();
    $('#day-label').textContent = isToday ? 'Hoy' : new Date(date + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    $('#day-next').disabled = isToday;
    const entries = st.food?.[date] || [];
    const tot = dayTotals(entries);
    const target = s.target?.kcal ? round10(s.target.kcal) : null;
    $('#kcal-eaten').textContent = int(tot.kcal);
    $('#intake-label').textContent = isToday ? 'Hoy llevas' : 'Ese día comiste';
    const bar = $('#kcal-bar');
    const pct = target ? Math.min(1.25, tot.kcal / target) : 0;
    bar.style.width = `${Math.min(100, pct * 100)}%`;
    bar.className = tot.kcal > (target || Infinity) * 1.05 ? 'over' : '';
    const exNote = isToday && s.target?.exercise ? ` (con ${int(s.target.exercise)} del ejercicio)` : '';
    $('#kcal-sub').textContent = !target ? ''
      : tot.kcal <= target ? `de ${int(target)} kcal${exNote} · te quedan ${int(target - tot.kcal)}`
        : `de ${int(target)} kcal${exNote} · ${int(tot.kcal - target)} de más`;
    const pr = s.protein;
    $('#macros').textContent = `${int(tot.p)} g de proteína${pr ? ` (lo tuyo: ${int(pr[0])}–${int(pr[1])} g)` : ''} · ${int(tot.c)} g hidratos · ${int(tot.f)} g grasa`;

    renderDayQuality(entries, st, isToday);
    renderIdeas(s, date, isToday, tot, target);
    renderMenu(s);

    const wrap = $('#meals');
    wrap.replaceChildren();
    MEALS.forEach(meal => {
      const items = entries.filter(e => e.meal === meal.id);
      const mt = dayTotals(items);
      const label = document.createElement('p');
      label.className = 'section-label';
      label.textContent = items.length ? `${meal.label} · ${int(mt.kcal)} kcal` : meal.label;
      const ul = document.createElement('ul');
      ul.className = 'group log';
      items.forEach(e => {
        ul.appendChild(resultRow(e.name, portionText(e), `${int(e.kcal)} kcal`, () => openEdit(date, e), entryQuality(e, st)?.q));
      });
      const add = resultRow(`Añadir a ${meal.label.toLowerCase()}`, null, '', () => openAdd(meal.id));
      add.querySelector('.log-row').classList.add('add');
      ul.appendChild(add);
      if (items.length >= 2) {
        const save = resultRow('Guardar como plato', 'para apuntarlo de un toque otro día', '', () => openSaveDish(meal.id));
        save.querySelector('.log-row').classList.add('add');
        ul.appendChild(save);
      }
      wrap.append(label, ul);
    });

    const dl = $('#dishes');
    dl.replaceChildren();
    const dishes = st.dishes || [];
    $('#dishes-empty').hidden = dishes.length > 0;
    dishes.forEach(d => {
      dl.appendChild(resultRow(d.name, `1 ración · ${int(d.grams)} g`, `${int(d.k * d.grams / 100)} kcal`, () => {
        if (!confirm(`¿Borrar el plato «${d.name}»? Lo que ya apuntaste con él no se toca.`)) return;
        st.dishes = st.dishes.filter(x => x.id !== d.id);
        st.recentFoods = (st.recentFoods || []).filter(r => !(r.src === 'plato' && r.ref === d.id));
        if (persist('Plato borrado.')) render();
      }));
    });
  }

  /* ── el menú de la semana ─────────────────────────────────────────── */

  let menuDay = null;          // el día del menú que se está viendo (índice)

  function menuKcal(s) {
    return Math.round((s.targetBase?.kcal || s.target?.kcal || 2000) / 10) * 10;
  }

  function avoidText() {
    const st = getState();
    return `${st.habits?.allergies || ''} ${st.habits?.dislikes || ''}`;
  }

  function makeMenu(s, seed) {
    const st = getState();
    st.meta = { ...(st.meta || {}), menu: { ...buildMenu({ start: today(), dayKcal: menuKcal(s), avoidText: avoidText(), seed }), checked: {} } };
    menuDay = 0;
    if (persist('Menú listo: siete días con tus calorías y la lista de la compra.')) render();
  }

  const shortDay = iso => {
    const d = new Date(iso + 'T12:00');
    return iso === today() ? 'Hoy' : d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }).replace('.', '');
  };

  function renderMenu(s) {
    const card = $('#menu-card');
    card.replaceChildren();
    const st = getState();
    const menu = st.meta?.menu;
    const last = menu?.days?.[menu.days.length - 1]?.date;
    const active = menu && last >= today();
    if (!active) {
      const t = document.createElement('p'); t.className = 'message-title';
      t.textContent = menu ? 'Tu menú de la semana ha terminado' : 'Te preparo el menú de la semana';
      const x = document.createElement('p'); x.className = 'message-text';
      x.textContent = `Siete días de platos de casa con calorías buenas, repartidos en cinco tomas y con las raciones ajustadas a tus ${int(menuKcal(s))} kcal. Sin tus alergias ni lo que no te gusta, y con la lista de la compra hecha.`;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn primary block'; b.textContent = menu ? 'Preparar el de esta semana' : 'Preparar mi menú';
      b.addEventListener('click', () => makeMenu(s, (menu?.seed || 0) + 1));
      card.append(t, x, b);
      return;
    }
    const todayIdx = menu.days.findIndex(d => d.date === today());
    if (menuDay == null || menuDay >= menu.days.length) menuDay = Math.max(0, todayIdx);
    // los días
    const chips = document.createElement('div');
    chips.className = 'menu-days';
    chips.setAttribute('role', 'tablist');
    menu.days.forEach((d, i) => {
      if (d.date < today()) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(i === menuDay));
      b.textContent = shortDay(d.date);
      b.addEventListener('click', () => { menuDay = i; renderMenu(s); });
      chips.appendChild(b);
    });
    card.appendChild(chips);
    const day = menu.days[menuDay];
    const isToday = day.date === today();
    const logged = new Set((st.food?.[today()] || []).map(e => e.meal));
    const ul = document.createElement('ul');
    ul.className = 'menu-meals';
    SLOTS.forEach(slot => {
      const pick = day.meals[slot.id];
      const n = mealNutrients(pick);
      if (!n) return;
      const li = document.createElement('li');
      const head = document.createElement('p'); head.className = 'menu-slot'; head.textContent = slot.label;
      const name = document.createElement('p'); name.className = 'menu-dish';
      const dot = document.createElement('span'); dot.className = 'qdot q-b'; dot.setAttribute('aria-hidden', 'true');
      name.append(dot, document.createTextNode(n.idea.name));
      const meta = document.createElement('p'); meta.className = 'menu-meta';
      meta.textContent = `${int(n.kcal)} kcal · ${int(n.p)} g de proteína${factorText(n.f) ? ` · ${factorText(n.f)}` : ''}`;
      const acts = document.createElement('div'); acts.className = 'menu-acts';
      if (isToday) {
        const log = document.createElement('button'); log.type = 'button'; log.className = 'btn small ghost';
        log.textContent = logged.has(slot.id) ? 'Apuntar otra vez' : 'Apuntar';
        log.addEventListener('click', () => logIdea(n.idea, n, slot.id));
        acts.appendChild(log);
      }
      const sw = document.createElement('button'); sw.type = 'button'; sw.className = 'btn small plain'; sw.textContent = 'Cambiar';
      sw.addEventListener('click', () => {
        const used = {};
        menu.days.forEach((d, i) => { if (i !== menuDay && d.meals[slot.id]) (used[slot.id] = used[slot.id] || []).push(d.meals[slot.id].id); });
        const tried = [...(menu.tried?.[`${menuDay}:${slot.id}`] || []), pick.id];
        let next = pickFor(slot, { dayKcal: menu.dayKcal, avoidText: avoidText(), seed: menu.seed + tried.length, dayIndex: menuDay, used, exclude: tried });
        const key = `${menuDay}:${slot.id}`;
        if (!next) {                                           // ya se han visto todas: se vuelve a empezar
          next = pickFor(slot, { dayKcal: menu.dayKcal, avoidText: avoidText(), seed: menu.seed + 99, dayIndex: menuDay, used, exclude: [pick.id] });
          menu.tried = { ...(menu.tried || {}), [key]: [] };
        } else menu.tried = { ...(menu.tried || {}), [key]: tried };
        if (!next) { toast('No hay otra idea para esta toma con tus alergias.'); return; }
        day.meals[slot.id] = next;
        if (persist()) renderMenu(s);
      });
      acts.appendChild(sw);
      li.append(head, name, meta);
      const steps = HOW[n.idea.id];
      if (steps?.length) {
        const how = document.createElement('details'); how.className = 'menu-how';
        const sm = document.createElement('summary'); sm.textContent = 'Cómo se hace';
        const ol = document.createElement('ol');
        steps.forEach(t => { const x = document.createElement('li'); x.textContent = t; ol.appendChild(x); });
        if (n.f > 1) { const x = document.createElement('li'); x.className = 'menu-how-note'; x.textContent = `Hoy toca ${factorText(n.f)}: multiplica las cantidades por ${String(n.f).replace('.', ',')}.`; ol.appendChild(x); }
        how.append(sm, ol);
        li.appendChild(how);
      }
      li.appendChild(acts);
      ul.appendChild(li);
    });
    card.appendChild(ul);
    const tot = dayTotal(day);
    const sum = document.createElement('p'); sum.className = 'card-foot';
    sum.textContent = `Total del día: ${int(tot.kcal)} de ${int(menu.dayKcal)} kcal · ${int(tot.p)} g de proteína. Las raciones ya van ajustadas a tus calorías.`;
    card.appendChild(sum);
    const row = document.createElement('div'); row.className = 'menu-row';
    const shop = document.createElement('button'); shop.type = 'button'; shop.className = 'btn primary small'; shop.textContent = 'Lista de la compra';
    shop.addEventListener('click', openShop);
    const redo = document.createElement('button'); redo.type = 'button'; redo.className = 'btn plain small'; redo.textContent = 'Otra propuesta';
    redo.addEventListener('click', () => { if (confirm('¿Hago otro menú desde hoy? El de ahora se sustituye.')) makeMenu(s, (menu.seed || 0) + 7); });
    row.append(shop, redo);
    card.appendChild(row);
  }

  /* ── comer fuera ─────────────────────────────────────────────────── */

  const odlg = $('#out-dialog');
  let outPlace = 'menu';

  function renderOut() {
    const place = PLACES.find(p => p.id === outPlace) || PLACES[0];
    const chips = $('#out-places');
    chips.replaceChildren();
    PLACES.forEach(p => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(p.id === place.id));
      b.textContent = p.label;
      b.addEventListener('click', () => { outPlace = p.id; renderOut(); });
      chips.appendChild(b);
    });
    $('#out-intro').textContent = place.intro;
    const box = $('#out-groups');
    box.replaceChildren();
    placeView(place).forEach(g => {
      const h = document.createElement('p'); h.className = `section-label out-${g.q}`; h.textContent = g.title;
      const ul = document.createElement('ul'); ul.className = 'group log';
      g.rows.forEach(r => {
        ul.appendChild(resultRow(r.note, `${portionText({ unit: r.unit, qty: r.qty, grams: r.grams })} de ${r.food.n.toLowerCase()}${r.tags.length ? ` · ${tagLine(r.tags, 2).toLowerCase()}` : ''}`,
          `${int(r.kcal)} kcal`, () => {
            targetMeal = mealForNow();
            day = null;
            addEntries([entryFor({ ...r.food, src: 'tabla' }, r.unit, r.qty)], `${r.food.n}: ${int(r.kcal)} kcal`);
            odlg.close();
          }, r.q));
      });
      box.append(h, ul);
    });
    const tips = $('#out-tips');
    tips.replaceChildren();
    place.tips.forEach(t => { const li = document.createElement('li'); li.textContent = t; tips.appendChild(li); });
  }

  $('#out-open').addEventListener('click', () => { renderOut(); odlg.showModal(); odlg.scrollTop = 0; });
  $('#out-close').addEventListener('click', () => odlg.close());
  odlg.addEventListener('click', e => { if (e.target === odlg) odlg.close(); });

  /* ── la lista de la compra ───────────────────────────────────────── */

  const sdlg = $('#shop-dialog');

  function remainingMenu() {
    const menu = getState().meta?.menu;
    return menu ? { ...menu, days: menu.days.filter(d => d.date >= today()) } : null;
  }

  function renderShop() {
    const st = getState();
    const menu = remainingMenu();
    const checked = st.meta?.menu?.checked || {};
    const groups = shoppingList(menu);
    const box = $('#shop-list');
    box.replaceChildren();
    const total = groups.reduce((a, g) => a + g.items.length, 0);
    const done = groups.reduce((a, g) => a + g.items.filter(i => checked[i.id]).length, 0);
    $('#shop-sub').textContent = `Para ${menu.days.length === 7 ? 'los siete días' : `los ${menu.days.length} días que quedan`} del menú. ${done ? `Llevas ${done} de ${total}.` : 'Toca cada cosa al echarla al carro.'}`;
    groups.forEach(g => {
      const h = document.createElement('p'); h.className = 'section-label'; h.textContent = g.name;
      const ul = document.createElement('ul'); ul.className = 'group shop-group';
      g.items.forEach(it => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `shop-item${checked[it.id] ? ' done' : ''}`;
        b.setAttribute('aria-pressed', String(!!checked[it.id]));
        const box2 = document.createElement('span'); box2.className = 'shop-check'; box2.setAttribute('aria-hidden', 'true');
        const txt = document.createElement('span'); txt.className = 'shop-text';
        const nm = document.createElement('span'); nm.className = 'shop-name'; nm.textContent = it.name;
        const am = document.createElement('span'); am.className = 'shop-amount'; am.textContent = `${it.amount}${it.note ? ` · ${it.note}` : ''}`;
        txt.append(nm, am);
        b.append(box2, txt);
        b.addEventListener('click', () => {
          const m = getState().meta.menu;
          m.checked = { ...(m.checked || {}), [it.id]: !m.checked?.[it.id] };
          if (persist()) renderShop();
        });
        li.appendChild(b);
        ul.appendChild(li);
      });
      box.append(h, ul);
    });
  }

  function openShop() {
    renderShop();
    sdlg.showModal();
  }

  $('#shop-close').addEventListener('click', () => sdlg.close());
  sdlg.addEventListener('click', e => { if (e.target === sdlg) sdlg.close(); });
  $('#shop-clear').addEventListener('click', () => {
    const m = getState().meta?.menu;
    if (!m) return;
    m.checked = {};
    if (persist()) renderShop();
  });
  $('#shop-share').addEventListener('click', async () => {
    const text = shoppingText(shoppingList(remainingMenu()), getState().meta?.menu?.checked || {});
    try {
      if (navigator.share) { await navigator.share({ title: 'Lista de la compra', text }); return; }
    } catch (err) { if (err?.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); toast('Lista copiada: pégala donde quieras.'); }
    catch { toast('No he podido compartirla desde aquí.', true); }
  });

  /* ── qué tipo de calorías llevas hoy ──────────────────────────────── */

  function renderDayQuality(entries, st, isToday) {
    const box = $('#qday');
    const mix = qualityMix(entries, st);
    box.hidden = mix.known < 50;
    if (box.hidden) return;
    const pc = c => Math.round(mix.pct[c] * 100);
    ['b', 'r', 'm'].forEach(c => { $(`#qbar-${c}`).style.width = `${mix.pct[c] * 100}%`; });
    const legend = $('#qday-legend');
    legend.replaceChildren();
    ['b', 'r', 'm'].filter(c => pc(c) > 0).forEach(c => {
      const sp = document.createElement('span');
      const dot = document.createElement('span'); dot.className = `qdot q-${c}`; dot.setAttribute('aria-hidden', 'true');
      sp.append(dot, document.createTextNode(`${pc(c)} % ${QSHORT[c]}`));
      legend.appendChild(sp);
    });
    const notes = [];
    if (mix.worst && mix.pct.m >= 0.1) {
      notes.push(`Lo que más resta${isToday ? ' hoy' : ''}: ${mix.worst.entry.name.toLowerCase()}, ${int(mix.worst.kcal)} kcal${mix.worst.tags.length ? ` de ${tagLine(mix.worst.tags, 2).toLowerCase()}` : ''}.`);
    }
    if (mix.pct.b >= 0.7) notes.push('Casi todo comida de verdad: así las calorías te alimentan y te sacian.');
    else if (mix.pct.m >= 0.35) notes.push('Más de un tercio son calorías que no alimentan: cambiar una de ellas por comida de verdad cuenta más que comer menos.');
    if (mix.kcal.sin >= 50) notes.push(`${int(mix.kcal.sin)} kcal apuntadas a mano, sin clasificar.`);
    $('#qday-note').textContent = notes.join(' ');
  }

  /* ── ideas para la próxima comida ────────────────────────────────── */

  const MEAL_WORD = { desayuno: 'el desayuno', comida: 'la comida', cena: 'la cena', picoteo: 'picar algo' };

  function renderIdeas(s, date, isToday, tot, target) {
    const card = $('#ideas-card');
    card.replaceChildren();
    if (!isToday || !target) { card.hidden = true; return; }
    const st = getState();
    const hour = new Date().getHours() + new Date().getMinutes() / 60;
    const proteinMid = s.protein ? (s.protein[0] + s.protein[1]) / 2 : 0;
    const remaining = target - tot.kcal;
    // la siguiente comida que aún no tenga nada apuntado
    const SLOTS = [['desayuno', 0], ['media', 10.5], ['comida', 12.5], ['merienda', 16], ['cena', 19.5]];
    const todays = st.food?.[date] || [];
    let slot = SLOTS.reduce((acc, [id, from], i) => (hour >= from ? i : acc), 0);
    while (slot < SLOTS.length && todays.some(e => e.meal === SLOTS[slot][0])) slot++;
    const slotId = slot < SLOTS.length ? SLOTS[slot][0] : 'picoteo';
    const ideaMeal = ['media', 'merienda'].includes(slotId) ? 'picoteo' : slotId;
    const res = suggest({
      meal: ideaMeal, hour, remainingKcal: remaining, proteinGap: proteinMid - tot.p, dayKcalTarget: target,
      avoidText: `${st.habits?.allergies || ''} ${st.habits?.dislikes || ''}`,
      recentIdeaIds: st.meta?.recentIdeas || [],
    });
    card.hidden = false;
    const t = document.createElement('p'); t.className = 'eyebrow';
    t.textContent = `Ideas para ${slotId === 'media' ? 'media mañana' : slotId === 'merienda' ? 'la merienda' : MEAL_WORD[res.meal]}`;
    const sub = document.createElement('p'); sub.className = 'card-sub';
    const gap = Math.round(proteinMid - tot.p);
    if (remaining < 150) {
      sub.textContent = 'Por hoy ya has llegado a tu objetivo. Si tienes hambre de verdad: verdura, una infusión o un yogur natural.';
      card.append(t, sub);
      return;
    }
    sub.textContent = `Te quedan ${int(remaining)} kcal${gap > 15 ? ` y te faltan unos ${gap} g de proteína` : ''}. Toca una idea y la apunto.`;
    card.append(t, sub);
    const ul = document.createElement('ul'); ul.className = 'group log inner';
    res.items.forEach(({ idea, n }) => {
      ul.appendChild(resultRow(idea.name, `${int(n.kcal)} kcal · ${int(n.p)} g proteína`, '', () => logIdea(idea, n, slotId)));
    });
    card.appendChild(ul);
  }

  function logIdea(idea, n, slotId) {
    const st = getState();
    targetMeal = slotId;
    const entries = n.parts.map(p => entryFor({ ...p.food, src: 'tabla' }, p.unit, p.qty));
    st.meta = { ...(st.meta || {}), recentIdeas: [idea.id, ...((st.meta?.recentIdeas) || []).filter(x => x !== idea.id)].slice(0, 6) };
    day = null;
    addEntries(entries, `${idea.name}: ${int(n.kcal)} kcal`);
  }

  function openEdit(date, e) {
    editing = { date, id: e.id };
    targetMeal = e.meal;
    $('#food-title').textContent = 'Corregir';
    if (e.src === 'manual') {
      if (confirm(`¿Quitar «${e.name}» (${int(e.kcal)} kcal)?`)) {
        const st = getState();
        st.food[date] = st.food[date].filter(x => x.id !== e.id);
        if (persist('Quitado.')) render();
      }
      editing = null;
      return;
    }
    const item = itemFromRef(e.src, e.ref) || { id: e.ref, n: e.name, a: [], k: e.grams ? e.kcal / e.grams * 100 : e.kcal, p: e.grams ? e.p / e.grams * 100 : 0, c: 0, f: 0, u: [[e.unit, e.qty ? e.grams / e.qty : 100]], src: e.src };
    dlg.showModal();
    openPortion(item, e.unit, e.unit === 'g' ? e.grams : e.qty, e);
  }

  $('#day-prev').addEventListener('click', () => {
    const d = new Date(viewDay() + 'T12:00'); d.setDate(d.getDate() - 1);
    const p = n => String(n).padStart(2, '0');
    day = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    render();
  });
  $('#day-next').addEventListener('click', () => {
    const d = new Date(viewDay() + 'T12:00'); d.setDate(d.getDate() + 1);
    const p = n => String(n).padStart(2, '0');
    const next = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    day = next >= today() ? null : next;
    render();
  });

  return { renderComidas, openAdd: () => openAdd(mealForNow()), resetDay: () => { day = null; } };
}

export { norm };
