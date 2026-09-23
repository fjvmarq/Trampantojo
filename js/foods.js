/* Trampantojo — la tabla de alimentos, y cómo se busca en ella.

   Valores orientativos por 100 g (o 100 ml): kcal, proteína, hidratos y grasa,
   tomados de tablas públicas (USDA FoodData Central, CIQUAL) y, para los platos,
   de recetas tipo. Un plato casero varía mucho según quién lo haga: por eso la
   app mide además tu gasto REAL con la báscula, que corrige el error de la tabla.

   Cada alimento trae sus raciones caseras (la primera es la de por defecto),
   para que apuntar sea «1 plato» y no «¿cuántos gramos serán?». */

const T = [];
// F(id, nombre, alias, kcal, proteína, hidratos, grasa, raciones [[nombre, gramos], …])
function F(id, n, a, k, p, c, f, u) { T.push({ id, n, a, k, p, c, f, u }); }

/* ── pan, cereales, pasta, arroz y patata ───────────────────────────── */
F('pan-blanco', 'Pan blanco', ['pan', 'barra', 'baguette', 'tostada', 'tostadas', 'pan tostado'], 265, 9, 51, 3.2, [['rebanada', 30], ['trozo', 40], ['media barra', 120], ['barra', 240], ['panecillo', 60]]);
F('pan-integral', 'Pan integral', ['pan integral', 'tostada integral'], 250, 10, 43, 3.5, [['rebanada', 30], ['trozo', 40], ['media barra', 120]]);
F('pan-molde', 'Pan de molde', ['pan bimbo', 'sandwich pan'], 265, 8, 49, 4, [['rebanada', 25]]);
F('biscote', 'Biscotes / pan tostado de paquete', ['biscotes', 'pan tostado de paquete', 'tostas'], 410, 11, 72, 7, [['unidad', 8]]);
F('tortita-arroz', 'Tortitas de arroz o maíz', ['tortitas de arroz', 'tortitas de maiz'], 385, 8, 80, 3, [['unidad', 8]]);
F('wrap', 'Tortilla de trigo (wrap)', ['wrap', 'fajita', 'burrito pan', 'pan de pita', 'pita'], 310, 8, 52, 7, [['unidad', 60]]);
F('arroz-cocido', 'Arroz blanco cocido', ['arroz', 'arroz blanco'], 130, 2.7, 28, 0.3, [['plato', 200], ['ración', 150], ['taza', 160]]);
F('arroz-crudo', 'Arroz crudo (peso en seco)', ['arroz crudo'], 360, 7, 79, 0.6, [['ración', 80]]);
F('pasta-cocida', 'Pasta cocida', ['pasta', 'macarrones', 'espaguetis', 'spaguetti', 'fideos', 'tallarines'], 158, 5.8, 31, 0.9, [['plato', 220], ['ración', 180]]);
F('pasta-cruda', 'Pasta cruda (peso en seco)', ['pasta cruda'], 371, 13, 75, 1.5, [['ración', 80]]);
F('avena', 'Copos de avena', ['avena', 'porridge', 'gachas'], 379, 13, 68, 6.5, [['ración', 40], ['cucharada', 10]]);
F('cereales', 'Cereales de desayuno', ['cereales', 'corn flakes', 'copos de maiz'], 375, 7, 84, 1, [['bol', 30]]);
F('cereales-choco', 'Cereales de chocolate o azucarados', ['cereales de chocolate', 'choco krispies', 'cereales azucarados'], 390, 7, 82, 4, [['bol', 30]]);
F('muesli', 'Muesli', ['granola'], 370, 10, 66, 6, [['bol', 45]]);
F('quinoa', 'Quinoa cocida', ['quinoa', 'quinua'], 120, 4.4, 21, 1.9, [['plato', 185]]);
F('cuscus', 'Cuscús cocido', ['cuscus', 'couscous'], 112, 3.8, 23, 0.2, [['plato', 180]]);
F('patata-cocida', 'Patata cocida o asada', ['patata', 'patatas', 'patata cocida', 'patata asada', 'papas'], 87, 1.9, 20, 0.1, [['unidad', 170], ['plato', 250]]);
F('patatas-fritas', 'Patatas fritas caseras', ['patatas fritas', 'papas fritas', 'fritas'], 312, 3.4, 41, 15, [['ración', 150], ['plato', 200]]);
F('patatas-bolsa', 'Patatas fritas de bolsa', ['patatas de bolsa', 'chips', 'patatillas'], 536, 7, 53, 34, [['bolsa pequeña', 40], ['puñado', 25]]);
F('boniato', 'Boniato asado', ['boniato', 'batata'], 90, 2, 21, 0.2, [['unidad', 200]]);

/* ── legumbres ──────────────────────────────────────────────────────── */
F('lentejas', 'Lentejas cocidas', ['lentejas'], 116, 9, 20, 0.4, [['plato', 250], ['ración', 200]]);
F('lentejas-chorizo', 'Lentejas estofadas con chorizo', ['lentejas con chorizo', 'lentejas guisadas', 'lentejas de la abuela'], 150, 8, 15, 6, [['plato', 300]]);
F('garbanzos', 'Garbanzos cocidos', ['garbanzos'], 164, 8.9, 27, 2.6, [['plato', 250], ['ración', 150]]);
F('cocido', 'Cocido madrileño', ['cocido', 'puchero', 'olla'], 150, 10, 11, 7, [['plato', 400]]);
F('alubias', 'Alubias cocidas', ['alubias', 'judias blancas', 'judiones'], 127, 8.7, 22.8, 0.5, [['plato', 250]]);
F('fabada', 'Fabada asturiana', ['fabada', 'fabes'], 170, 9, 12, 10, [['plato', 350]]);
F('hummus', 'Hummus', ['humus'], 166, 7.9, 14, 9.6, [['cucharada', 15], ['ración', 50]]);
F('edamame', 'Edamame', ['soja verde'], 121, 12, 9, 5, [['ración', 100]]);
F('guisantes', 'Guisantes cocidos', ['guisantes'], 84, 5.4, 15.6, 0.2, [['ración', 150]]);

/* ── verduras ───────────────────────────────────────────────────────── */
F('ensalada-verde', 'Ensalada verde (sin aliñar)', ['ensalada', 'ensalada verde', 'lechuga y tomate'], 18, 1, 3, 0.2, [['plato', 150], ['bol', 200]]);
F('ensalada-mixta', 'Ensalada mixta con atún y huevo (sin aliñar)', ['ensalada mixta', 'ensalada completa'], 80, 6, 4, 4.5, [['plato', 250]]);
F('tomate', 'Tomate', ['tomates'], 18, 0.9, 3.9, 0.2, [['unidad', 120]]);
F('lechuga', 'Lechuga', ['lechuga'], 15, 1.4, 2.9, 0.2, [['plato', 80]]);
F('zanahoria', 'Zanahoria', ['zanahorias'], 41, 0.9, 10, 0.2, [['unidad', 80]]);
F('pepino', 'Pepino', ['pepinos'], 15, 0.7, 3.6, 0.1, [['unidad', 200]]);
F('pimiento', 'Pimiento', ['pimientos', 'pimiento rojo', 'pimiento verde'], 31, 1, 6, 0.3, [['unidad', 150]]);
F('cebolla', 'Cebolla', ['cebollas'], 40, 1.1, 9.3, 0.1, [['unidad', 110]]);
F('calabacin', 'Calabacín', ['calabacines'], 17, 1.2, 3.1, 0.3, [['unidad', 200]]);
F('berenjena', 'Berenjena', ['berenjenas'], 25, 1, 6, 0.2, [['unidad', 250]]);
F('brocoli', 'Brócoli cocido', ['brocoli', 'broccoli', 'brecol'], 35, 2.4, 7, 0.4, [['ración', 150]]);
F('coliflor', 'Coliflor cocida', ['coliflor'], 23, 1.8, 4.1, 0.5, [['ración', 150]]);
F('judias-verdes', 'Judías verdes cocidas', ['judias verdes', 'vainas', 'judia verde'], 35, 1.9, 7.9, 0.3, [['plato', 200]]);
F('espinacas', 'Espinacas cocidas', ['espinacas', 'acelgas'], 23, 3, 3.8, 0.3, [['ración', 150]]);
F('champinones', 'Champiñones', ['champiñones', 'setas', 'champis'], 22, 3.1, 3.3, 0.3, [['ración', 100]]);
F('verduras-plancha', 'Verduras a la plancha (con aceite)', ['verduras a la plancha', 'parrillada de verduras', 'verduras'], 60, 1.5, 6, 3.5, [['plato', 200]]);
F('menestra', 'Menestra de verduras', ['menestra'], 60, 3, 8, 2, [['plato', 250]]);
F('pisto', 'Pisto', ['pisto manchego', 'samfaina'], 70, 1.5, 7, 4, [['ración', 150]]);
F('gazpacho', 'Gazpacho', ['gazpacho andaluz'], 55, 0.9, 4, 4, [['vaso', 250], ['bol', 300]]);
F('salmorejo', 'Salmorejo', ['salmorejo cordobes'], 110, 2.5, 10, 7, [['bol', 250]]);
F('crema-verduras', 'Crema o puré de verduras', ['crema de verduras', 'pure de verduras', 'crema de calabacin', 'crema de calabaza'], 45, 1.5, 6, 1.8, [['plato', 300]]);
F('aguacate', 'Aguacate', ['aguacates', 'palta'], 160, 2, 8.5, 14.7, [['medio', 75], ['unidad', 150]]);
F('aceitunas', 'Aceitunas', ['olivas'], 145, 1, 3.8, 15, [['ración', 40], ['unidad', 4]]);
F('maiz', 'Maíz dulce', ['maiz', 'mazorca'], 86, 3.3, 19, 1.4, [['ración', 80]]);

/* ── fruta ──────────────────────────────────────────────────────────── */
F('manzana', 'Manzana', ['manzanas'], 52, 0.3, 14, 0.2, [['pieza', 180]]);
F('pera', 'Pera', ['peras'], 57, 0.4, 15, 0.1, [['pieza', 180]]);
F('platano', 'Plátano', ['platanos', 'banana', 'banano'], 89, 1.1, 23, 0.3, [['pieza', 120]]);
F('naranja', 'Naranja', ['naranjas'], 47, 0.9, 12, 0.1, [['pieza', 180]]);
F('mandarina', 'Mandarina', ['mandarinas', 'clementina'], 53, 0.8, 13, 0.3, [['pieza', 80]]);
F('fresas', 'Fresas', ['fresa', 'freson'], 32, 0.7, 7.7, 0.3, [['ración', 150]]);
F('uvas', 'Uvas', ['uva'], 69, 0.7, 18, 0.2, [['racimo', 150]]);
F('melon', 'Melón', ['melon'], 34, 0.8, 8, 0.2, [['tajada', 200]]);
F('sandia', 'Sandía', ['sandia'], 30, 0.6, 7.6, 0.2, [['tajada', 300]]);
F('melocoton', 'Melocotón', ['melocotones', 'nectarina', 'paraguayo'], 39, 0.9, 9.5, 0.3, [['pieza', 150]]);
F('kiwi', 'Kiwi', ['kiwis'], 61, 1.1, 15, 0.5, [['pieza', 75]]);
F('pina', 'Piña', ['pina', 'ananas'], 50, 0.5, 13, 0.1, [['rodaja', 100]]);
F('mango', 'Mango', ['mangos'], 60, 0.8, 15, 0.4, [['pieza', 200]]);
F('cerezas', 'Cerezas', ['cereza', 'picotas'], 63, 1.1, 16, 0.2, [['ración', 150]]);
F('arandanos', 'Arándanos o frutos rojos', ['arandanos', 'frambuesas', 'moras', 'frutos rojos'], 57, 0.7, 14, 0.3, [['ración', 100]]);
F('datiles', 'Dátiles', ['datil'], 282, 2.5, 75, 0.4, [['unidad', 8]]);
F('pasas', 'Pasas', ['uvas pasas', 'orejones', 'fruta desecada'], 299, 3.1, 79, 0.5, [['puñado', 30]]);
F('zumo-naranja', 'Zumo de naranja natural', ['zumo de naranja', 'zumo natural'], 45, 0.7, 10.4, 0.2, [['vaso', 200]]);
F('zumo-envasado', 'Zumo envasado', ['zumo', 'zumo de brick', 'nectar'], 46, 0.5, 11, 0.1, [['vaso', 200]]);

/* ── lácteos ────────────────────────────────────────────────────────── */
F('leche-entera', 'Leche entera', ['leche'], 64, 3.2, 4.7, 3.6, [['vaso', 250], ['taza', 200], ['chorro', 30]]);
F('leche-semi', 'Leche semidesnatada', ['leche semi', 'semidesnatada'], 46, 3.3, 4.8, 1.6, [['vaso', 250], ['taza', 200], ['chorro', 30]]);
F('leche-desnatada', 'Leche desnatada', ['leche desnatada', 'desnatada'], 35, 3.4, 5, 0.1, [['vaso', 250], ['taza', 200], ['chorro', 30]]);
F('bebida-avena', 'Bebida de avena', ['leche de avena', 'bebida vegetal'], 45, 0.5, 7, 1.5, [['vaso', 250]]);
F('bebida-soja', 'Bebida de soja', ['leche de soja'], 40, 3.3, 2.5, 1.8, [['vaso', 250]]);
F('yogur-natural', 'Yogur natural', ['yogur', 'yogurt'], 61, 3.5, 4.7, 3.3, [['unidad', 125]]);
F('yogur-desnatado', 'Yogur desnatado natural', ['yogur desnatado', 'yogur 0'], 40, 4.2, 5.5, 0.2, [['unidad', 125]]);
F('yogur-azucarado', 'Yogur de sabores o azucarado', ['yogur de fresa', 'yogur azucarado', 'yogur de sabores'], 95, 3.3, 14, 2.8, [['unidad', 125]]);
F('yogur-griego', 'Yogur griego natural', ['yogur griego', 'griego'], 120, 3.5, 4, 10, [['unidad', 125]]);
F('skyr', 'Skyr o yogur proteico', ['skyr', 'yogur proteico', 'yogur alto en proteinas'], 60, 10, 4, 0.2, [['unidad', 150]]);
F('queso-fresco', 'Queso fresco (tipo Burgos)', ['queso fresco', 'queso de burgos', 'burgos'], 160, 12, 3, 11, [['ración', 60], ['tarrina', 250]]);
F('queso-batido', 'Queso fresco batido 0 %', ['queso batido', 'queso fresco batido', 'quark'], 46, 8, 3.6, 0.1, [['ración', 125]]);
F('queso-curado', 'Queso curado (manchego)', ['queso', 'queso curado', 'manchego', 'queso viejo'], 400, 26, 0.5, 33, [['taco', 25], ['loncha', 15], ['ración', 50]]);
F('queso-semi', 'Queso semicurado', ['queso semicurado', 'semicurado', 'queso tierno'], 360, 25, 1, 29, [['loncha', 20], ['ración', 50]]);
F('queso-lonchas', 'Queso en lonchas', ['queso en lonchas', 'queso de sandwich', 'havarti', 'gouda', 'edam'], 330, 21, 1, 27, [['loncha', 20]]);
F('mozzarella', 'Mozzarella', ['mozarella', 'queso mozzarella'], 250, 18, 1, 20, [['ración', 60], ['bola', 125]]);
F('queso-rallado', 'Queso rallado', ['queso rallado', 'emmental', 'parmesano'], 390, 28, 1, 30, [['cucharada', 10], ['puñado', 30]]);
F('nata', 'Nata para cocinar', ['nata', 'crema de leche'], 195, 2.5, 3.5, 18, [['cucharada', 15], ['brick', 200]]);
F('mantequilla', 'Mantequilla', ['manteca', 'margarina'], 717, 0.9, 0.1, 81, [['para una tostada', 10], ['cucharadita', 5]]);
F('natillas', 'Natillas', ['natilla', 'crema catalana', 'arroz con leche'], 120, 3.5, 18, 3.5, [['unidad', 125]]);
F('flan', 'Flan', ['flan de huevo'], 130, 4, 20, 3.5, [['unidad', 100]]);
F('helado', 'Helado', ['helados', 'polo'], 207, 3.5, 24, 11, [['bola', 60], ['tarrina', 120]]);
F('batido-cacao', 'Batido de cacao', ['batido de chocolate', 'cacaolat', 'batido'], 80, 3.2, 12, 1.8, [['brick', 200]]);

/* ── huevos ─────────────────────────────────────────────────────────── */
F('huevo', 'Huevo (cocido o crudo)', ['huevo', 'huevos', 'huevo cocido', 'huevo duro', 'huevo pasado por agua'], 143, 12.6, 0.7, 9.5, [['unidad', 55]]);
F('huevo-frito', 'Huevo frito', ['huevo frito', 'huevos fritos'], 210, 13, 0.8, 17, [['unidad', 60]]);
F('tortilla-francesa', 'Tortilla francesa', ['tortilla francesa'], 170, 11, 1, 13.5, [['de 2 huevos', 115], ['de 1 huevo', 60]]);
F('tortilla-patatas', 'Tortilla de patatas', ['tortilla', 'tortilla de patata', 'tortilla española', 'pincho de tortilla'], 185, 6.5, 14, 11.5, [['pincho', 100], ['ración', 150], ['entera', 700]]);
F('revuelto', 'Revuelto (de setas, espárragos…)', ['revuelto', 'huevos revueltos', 'huevos rotos'], 150, 9, 3, 11, [['ración', 150]]);

/* ── carne y embutido ───────────────────────────────────────────────── */
F('pollo-plancha', 'Pechuga de pollo a la plancha', ['pollo', 'pechuga', 'pechuga de pollo', 'pollo a la plancha'], 165, 31, 0, 3.6, [['filete', 150], ['ración', 125]]);
F('pollo-asado', 'Pollo asado con piel', ['pollo asado', 'muslo de pollo', 'contramuslo'], 239, 27, 0, 14, [['ración', 150], ['muslo', 100]]);
F('pavo-plancha', 'Pechuga de pavo a la plancha', ['pavo', 'pechuga de pavo'], 135, 30, 0, 1.5, [['filete', 150]]);
F('fiambre-pavo', 'Fiambre de pavo o pollo', ['fiambre de pavo', 'pavo en lonchas', 'pechuga de pavo en lonchas'], 105, 18, 2, 2.5, [['loncha', 15]]);
F('jamon-york', 'Jamón cocido (york)', ['jamon york', 'jamon cocido', 'york'], 120, 19, 1, 4, [['loncha', 20]]);
F('jamon-serrano', 'Jamón serrano', ['jamon', 'jamon serrano'], 260, 30, 0.5, 15, [['loncha', 15], ['ración', 50]]);
F('jamon-iberico', 'Jamón ibérico', ['jamon iberico', 'iberico', 'pata negra'], 375, 31, 0.5, 28, [['loncha', 12], ['ración', 50]]);
F('chorizo', 'Chorizo', ['chorizos'], 455, 24, 2, 38, [['loncha', 6], ['trozo', 40], ['ración', 50]]);
F('salchichon', 'Salchichón o fuet', ['salchichon', 'fuet', 'longaniza', 'salami'], 430, 26, 2, 35, [['loncha', 5], ['ración', 50]]);
F('lomo-embuchado', 'Lomo embuchado', ['lomo embuchado', 'caña de lomo'], 280, 40, 1, 13, [['loncha', 8]]);
F('ternera-plancha', 'Filete de ternera a la plancha', ['ternera', 'filete', 'filete de ternera', 'bistec', 'entrecot'], 200, 29, 0, 9, [['filete', 150]]);
F('ternera-guisada', 'Ternera guisada o estofada', ['estofado', 'ternera guisada', 'carne guisada', 'ragu'], 140, 14, 5, 7, [['plato', 300]]);
F('hamburguesa-casera', 'Hamburguesa de ternera (solo la carne)', ['hamburguesa de ternera', 'carne de hamburguesa'], 250, 26, 0, 16, [['unidad', 120]]);
F('lomo-cerdo', 'Lomo de cerdo a la plancha', ['lomo', 'cinta de lomo', 'chuleta de cerdo'], 190, 29, 0, 8, [['filete', 125]]);
F('costillas', 'Costillas de cerdo', ['costillas', 'costilla'], 290, 21, 0, 23, [['ración', 200]]);
F('secreto', 'Secreto o presa ibérica', ['secreto', 'presa', 'pluma iberica'], 300, 18, 0, 25, [['ración', 200]]);
F('salchichas', 'Salchichas', ['salchicha', 'frankfurt', 'perrito'], 290, 12, 3, 26, [['unidad', 50]]);
F('albondigas', 'Albóndigas en salsa', ['albondigas'], 180, 11, 8, 12, [['ración', 200]]);
F('nuggets', 'Pollo empanado o nuggets', ['nuggets', 'pollo empanado', 'san jacobo', 'libritos'], 270, 15, 16, 16, [['ración', 150], ['unidad', 20]]);
F('cordero', 'Chuletas de cordero', ['cordero', 'chuletillas'], 280, 25, 0, 20, [['ración', 150]]);
F('conejo', 'Conejo al ajillo', ['conejo'], 170, 23, 1, 8, [['ración', 200]]);

/* ── pescado y marisco ──────────────────────────────────────────────── */
F('merluza', 'Merluza a la plancha', ['merluza', 'pescado blanco', 'pescadilla', 'bacaladilla'], 90, 18, 0, 1.5, [['filete', 150]]);
F('merluza-rebozada', 'Merluza rebozada', ['merluza rebozada', 'pescado rebozado', 'varitas de merluza'], 200, 13, 10, 12, [['filete', 150]]);
F('salmon', 'Salmón a la plancha', ['salmon'], 208, 20, 0, 13, [['filete', 150]]);
F('atun-aceite', 'Atún en aceite (escurrido)', ['atun', 'atun en aceite', 'lata de atun'], 200, 25, 0, 10, [['lata', 52]]);
F('atun-natural', 'Atún al natural', ['atun al natural', 'atun natural'], 110, 25, 0, 1, [['lata', 52]]);
F('sardinas-lata', 'Sardinas en lata', ['sardinas', 'sardinillas', 'caballa en lata'], 208, 25, 0, 11.5, [['lata', 85]]);
F('bacalao', 'Bacalao', ['bacalao a la plancha'], 105, 23, 0, 1, [['ración', 150]]);
F('dorada', 'Dorada o lubina', ['dorada', 'lubina', 'pescado a la sal'], 120, 20, 0, 4, [['ración', 150]]);
F('gambas', 'Gambas o langostinos cocidos', ['gambas', 'langostinos', 'marisco', 'gambas cocidas'], 99, 24, 0.2, 0.3, [['ración', 100]]);
F('gambas-ajillo', 'Gambas al ajillo', ['gambas al ajillo'], 190, 18, 1, 13, [['ración', 150]]);
F('calamares', 'Calamares a la romana', ['calamares', 'rabas', 'chipirones', 'fritura de pescado'], 220, 13, 13, 13, [['ración', 150]]);
F('pulpo', 'Pulpo a la gallega', ['pulpo'], 150, 17, 1, 8, [['ración', 150]]);
F('mejillones', 'Mejillones al vapor (sin concha)', ['mejillones', 'almejas', 'berberechos'], 170, 24, 7, 4.5, [['ración', 100]]);
F('surimi', 'Surimi', ['palitos de cangrejo', 'gulas'], 99, 7, 15, 1, [['unidad', 15]]);
F('boquerones', 'Boquerones en vinagre', ['boquerones', 'anchoas'], 120, 18, 1, 5, [['ración', 100]]);

/* ── platos y tapas ─────────────────────────────────────────────────── */
F('paella', 'Paella', ['paella mixta', 'paella de marisco', 'arroz a banda', 'arroz con pollo'], 165, 8, 22, 5, [['plato', 350]]);
F('croquetas', 'Croquetas', ['croqueta'], 260, 9, 22, 15, [['unidad', 35]]);
F('empanadilla', 'Empanadilla', ['empanadillas'], 290, 8, 30, 15, [['unidad', 50]]);
F('empanada', 'Empanada gallega', ['empanada'], 280, 10, 30, 13, [['ración', 150]]);
F('pizza', 'Pizza', ['pizzas'], 266, 11, 33, 10, [['porción', 100], ['individual', 450]]);
F('lasana', 'Lasaña', ['lasagna', 'canelones'], 150, 8, 13, 7, [['ración', 350]]);
F('macarrones-chorizo', 'Macarrones con tomate y chorizo', ['macarrones con chorizo', 'macarrones con tomate'], 170, 6.5, 22, 6, [['plato', 300]]);
F('carbonara', 'Espaguetis a la carbonara', ['carbonara', 'pasta carbonara'], 190, 7.5, 21, 8.5, [['plato', 300]]);
F('bolonesa', 'Espaguetis a la boloñesa', ['boloñesa', 'bolonesa', 'pasta con carne'], 150, 7, 19, 5, [['plato', 300]]);
F('sopa', 'Sopa de fideos o consomé', ['sopa', 'consome', 'caldo'], 35, 2, 5, 1, [['plato', 300]]);
F('bravas', 'Patatas bravas', ['bravas', 'patatas alioli'], 220, 3, 25, 12, [['ración', 200]]);
F('ensaladilla', 'Ensaladilla rusa', ['ensaladilla'], 170, 4, 11, 12, [['ración', 150]]);
F('bocadillo-jamon', 'Bocadillo de jamón', ['bocadillo de jamon', 'bocata de jamon', 'bocadillo'], 260, 14, 34, 7, [['bocadillo', 175]]);
F('bocadillo-tortilla', 'Bocadillo de tortilla', ['bocadillo de tortilla', 'bocata de tortilla'], 240, 8, 30, 10, [['bocadillo', 250]]);
F('sandwich-mixto', 'Sándwich mixto', ['sandwich', 'mixto', 'bikini', 'tostada con jamon y queso'], 260, 14, 26, 11, [['unidad', 120]]);
F('hamburguesa-completa', 'Hamburguesa completa (con pan)', ['hamburguesa', 'burger', 'hamburguesa del burger'], 250, 13, 24, 11, [['unidad', 250]]);
F('kebab', 'Kebab o durum', ['kebab', 'durum', 'shawarma'], 215, 11, 22, 9, [['unidad', 400]]);
F('sushi', 'Sushi', ['maki', 'nigiri', 'california roll'], 150, 5, 28, 2, [['pieza', 30], ['ración de 8', 240]]);
F('burrito', 'Burrito o fajitas', ['burrito', 'fajitas', 'tacos', 'quesadilla'], 200, 9, 22, 8, [['unidad', 300]]);
F('churros', 'Churros o porras', ['churro', 'porras'], 380, 5, 45, 20, [['unidad', 25]]);
F('chocolate-taza', 'Chocolate a la taza', ['chocolate caliente', 'chocolate con churros'], 110, 3, 16, 4, [['taza', 200]]);

/* ── dulces, picoteo y frutos secos ─────────────────────────────────── */
F('chocolate-negro', 'Chocolate negro 70 %', ['chocolate negro', 'chocolate puro'], 600, 7.8, 46, 43, [['onza', 10], ['tableta', 100]]);
F('chocolate-leche', 'Chocolate con leche', ['chocolate', 'chocolatina', 'bombon'], 535, 7.7, 59, 30, [['onza', 10], ['tableta', 100]]);
F('galletas-maria', 'Galletas María', ['galletas', 'galleta', 'galletas maria'], 440, 7, 74, 13, [['unidad', 6]]);
F('galletas-choco', 'Galletas de chocolate o rellenas', ['galletas de chocolate', 'oreo', 'principe', 'galletas rellenas'], 480, 5, 68, 21, [['unidad', 12]]);
F('galletas-digestive', 'Galletas digestive o integrales', ['digestive', 'galletas integrales'], 480, 7, 64, 21, [['unidad', 15]]);
F('magdalena', 'Magdalena', ['magdalenas', 'muffin', 'bizcochito'], 440, 6, 50, 24, [['unidad', 30]]);
F('croissant', 'Cruasán', ['croissant', 'cruasan', 'medialuna'], 406, 8.2, 45, 21, [['unidad', 60]]);
F('napolitana', 'Napolitana de chocolate', ['napolitana', 'palmera de chocolate', 'caracola', 'bolleria'], 420, 6, 48, 22, [['unidad', 90]]);
F('donut', 'Dónut', ['donut', 'donuts', 'rosquilla'], 420, 5, 50, 22, [['unidad', 55]]);
F('bizcocho', 'Bizcocho casero', ['bizcocho', 'pan de pan', 'plum cake'], 360, 6, 50, 15, [['ración', 60]]);
F('tarta', 'Tarta (de queso, de chocolate…)', ['tarta', 'tarta de queso', 'pastel', 'tarta de chocolate'], 320, 5, 30, 20, [['porción', 120]]);
F('gominolas', 'Gominolas o chuches', ['chuches', 'golosinas', 'caramelos'], 340, 5, 80, 0, [['puñado', 30]]);
F('almendras', 'Almendras', ['almendra'], 579, 21, 22, 50, [['puñado', 30]]);
F('nueces', 'Nueces', ['nuez'], 654, 15, 14, 65, [['puñado', 30]]);
F('cacahuetes', 'Cacahuetes', ['cacahuete', 'mani'], 567, 26, 16, 49, [['puñado', 30]]);
F('pistachos', 'Pistachos', ['pistacho', 'anacardos'], 560, 20, 28, 45, [['puñado', 30]]);
F('frutos-secos', 'Frutos secos variados', ['frutos secos', 'coctel de frutos secos', 'kikos'], 600, 18, 20, 52, [['puñado', 30]]);
F('palomitas', 'Palomitas de microondas', ['palomitas', 'pipas'], 500, 8, 55, 28, [['bol', 40]]);
F('azucar', 'Azúcar', ['azucar', 'sobre de azucar'], 400, 0, 100, 0, [['cucharadita', 5], ['sobre', 8]]);
F('miel', 'Miel', ['miel'], 304, 0.3, 82, 0, [['cucharadita', 7], ['cucharada', 20]]);
F('mermelada', 'Mermelada', ['confitura'], 250, 0.4, 60, 0.1, [['cucharada', 20]]);
F('crema-cacao', 'Crema de cacao', ['nocilla', 'nutella', 'crema de chocolate'], 540, 6, 57, 31, [['cucharada', 15]]);
F('crema-cacahuete', 'Crema de cacahuete', ['mantequilla de cacahuete'], 590, 25, 20, 50, [['cucharada', 16]]);
F('barrita', 'Barrita de cereales', ['barrita', 'barrita energetica'], 400, 6, 65, 13, [['unidad', 25]]);

/* ── grasas y salsas ────────────────────────────────────────────────── */
F('aceite', 'Aceite de oliva', ['aceite', 'aove', 'aceite de girasol', 'aliño'], 884, 0, 0, 100, [['cucharada', 10], ['cucharadita', 4], ['chorrito', 5]]);
F('mayonesa', 'Mayonesa', ['mahonesa', 'alioli', 'salsa rosa'], 680, 1, 1, 75, [['cucharada', 15]]);
F('ketchup', 'Kétchup', ['ketchup', 'catsup', 'salsa barbacoa'], 110, 1.2, 25, 0.2, [['cucharada', 15]]);
F('tomate-frito', 'Tomate frito', ['tomate frito', 'salsa de tomate'], 80, 1.5, 11, 3.5, [['cucharada', 20], ['ración', 60]]);
F('mostaza', 'Mostaza', ['mostaza'], 66, 4, 6, 3, [['cucharadita', 5]]);
F('soja-salsa', 'Salsa de soja', ['salsa de soja', 'soja'], 53, 8, 5, 0.1, [['cucharada', 15]]);

/* ── bebidas ────────────────────────────────────────────────────────── */
F('cafe-solo', 'Café solo', ['cafe', 'cafe solo', 'expreso', 'americano'], 2, 0.1, 0, 0, [['taza', 60]]);
F('cafe-leche', 'Café con leche (sin azúcar)', ['cafe con leche', 'cortado', 'capuchino', 'latte'], 30, 2, 3, 1.1, [['taza', 200], ['cortado', 100]]);
F('colacao', 'Leche con cacao', ['colacao', 'nesquik', 'cola cao', 'cacao con leche'], 72, 3.3, 10, 1.8, [['taza', 250]]);
F('refresco', 'Refresco azucarado', ['coca cola', 'cocacola', 'refresco', 'fanta', 'aquarius', 'nestea'], 42, 0, 10.6, 0, [['lata', 330], ['vaso', 250]]);
F('refresco-zero', 'Refresco sin azúcar', ['coca cola zero', 'zero', 'light', 'refresco zero'], 0.3, 0, 0, 0, [['lata', 330]]);
F('cerveza', 'Cerveza', ['cerveza', 'caña', 'birra', 'doble'], 43, 0.5, 3.6, 0, [['caña', 200], ['tercio', 330], ['jarra', 500]]);
F('cerveza-sin', 'Cerveza sin alcohol', ['cerveza sin', 'sin alcohol', 'cerveza 0'], 22, 0.4, 4.6, 0, [['caña', 200], ['tercio', 330]]);
F('vino', 'Vino (tinto o blanco)', ['vino', 'vino tinto', 'vino blanco', 'rosado', 'cava'], 85, 0.1, 2.6, 0, [['copa', 150]]);
F('tinto-verano', 'Tinto de verano o sangría', ['tinto de verano', 'sangria'], 60, 0, 8, 0, [['vaso', 250]]);
F('vermut', 'Vermut', ['vermu', 'vermouth'], 150, 0, 14, 0, [['vaso', 100]]);
F('cubata', 'Copa (gin tonic, ron con cola…)', ['gin tonic', 'cubata', 'copa', 'ron con cola', 'whisky con cola'], 75, 0, 8, 0, [['copa', 250]]);
F('licor', 'Licor o whisky solo', ['whisky', 'chupito', 'orujo', 'licor'], 250, 0, 0, 0, [['chupito', 30]]);
F('isotonica', 'Bebida isotónica', ['isotonica', 'aquarius zero'], 25, 0, 6, 0, [['botella', 500]]);
F('infusion', 'Infusión o té', ['te', 'infusion', 'manzanilla', 'poleo'], 1, 0, 0.2, 0, [['taza', 250]]);
F('agua', 'Agua', ['agua'], 0, 0, 0, 0, [['vaso', 250], ['botella', 500]]);

export const FOODS = T;
export const FOODS_BY_ID = new Map(T.map(f => [f.id, f]));

/* ── buscar ─────────────────────────────────────────────────────────── */

export function norm(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const INDEX = T.map(f => ({ f, names: [norm(f.n), ...f.a.map(norm)] }));

/* Puntúa lo bien que `q` encaja con una lista de nombres.
   Igual > empieza igual > una palabra empieza igual > contiene. */
function scoreNames(q, names) {
  let best = 0;
  for (const name of names) {
    let s = 0;
    if (name === q) s = 100;
    else if (name.startsWith(q)) s = 80 - Math.min(20, name.length - q.length);
    else if (name.split(' ').some(w => w.startsWith(q))) s = 60;
    else if (name.includes(q)) s = 40;
    else {
      // todas las palabras de la búsqueda aparecen al principio de alguna palabra
      const qw = q.split(' ').filter(Boolean);
      const ww = name.split(' ');
      if (qw.length > 1 && qw.every(x => ww.some(w => w.startsWith(x)))) s = 50;
    }
    // un nombre de plural o singular casi igual («huevos» vs «huevo»)
    if (!s && q.length > 3 && (name === q.replace(/e?s$/, '') || q === name.replace(/e?s$/, ''))) s = 90;
    if (s > best) best = s;
  }
  return best;
}

/* Busca en la tabla y en los extras (tus platos y productos escaneados).
   `extras`: [{ id, n, a?, k, p, c, f, u, src }]. Devuelve los mejores primero. */
export function searchFoods(query, extras = [], limit = 20) {
  const q = norm(query);
  if (!q) return [];
  const out = [];
  for (const e of extras) {
    const s = scoreNames(q, [norm(e.n), ...(e.a || []).map(norm)]);
    if (s) out.push({ item: e, score: s + 5 });          // lo tuyo, un poco por delante
  }
  for (const { f, names } of INDEX) {
    const s = scoreNames(q, names);
    if (s) out.push({ item: { ...f, src: 'tabla' }, score: s });
  }
  out.sort((a, b) => b.score - a.score || a.item.n.length - b.item.n.length);
  return out.slice(0, limit).map(x => x.item);
}

/* ── frases sencillas: «2 huevos y una tostada» ─────────────────────── */

const NUMBERS = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8,
  nueve: 9, diez: 10, medio: 0.5, media: 0.5, par: 2, doble: 2,
};
const UNIT_WORDS = {
  plato: 'plato', platos: 'plato', vaso: 'vaso', vasos: 'vaso', taza: 'taza', tazas: 'taza',
  cucharada: 'cucharada', cucharadas: 'cucharada', cucharadita: 'cucharadita', cucharaditas: 'cucharadita',
  rebanada: 'rebanada', rebanadas: 'rebanada', loncha: 'loncha', lonchas: 'loncha', pieza: 'pieza', piezas: 'pieza',
  lata: 'lata', latas: 'lata', racion: 'ración', raciones: 'ración', trozo: 'trozo', trozos: 'trozo',
  onza: 'onza', onzas: 'onza', puñado: 'puñado', punado: 'puñado', punados: 'puñado', copa: 'copa', copas: 'copa',
  cana: 'caña', canas: 'caña', tercio: 'tercio', tercios: 'tercio', bol: 'bol', boles: 'bol', unidad: 'unidad',
  unidades: 'unidad', pincho: 'pincho', pinchos: 'pincho', filete: 'filete', filetes: 'filete', bola: 'bola', bolas: 'bola',
  jarra: 'jarra', botella: 'botella', tajada: 'tajada', tajadas: 'tajada', chupito: 'chupito', chupitos: 'chupito',
  g: 'g', gr: 'g', grs: 'g', gramo: 'g', gramos: 'g', ml: 'g', mililitros: 'g', kg: 'kg', kilo: 'kg',
};

// «2 huevos y una tostada, un café con leche» → ['2 huevos', 'una tostada', 'un café con leche']
export function splitPhrase(text) {
  return norm(text.replace(/\+/g, ',')).split(/\s*,\s*|\s+y\s+|\s+mas\s+/).map(s => s.trim()).filter(Boolean);
}

/* Entiende una parte: cantidad + ración + alimento. Devuelve null si no
   reconoce el alimento. `extras` como en searchFoods. */
export function parsePart(part, extras = []) {
  let words = norm(part).split(' ');
  let qty = 1, unit = null;
  if (words[0] === 'un' && words[1] === 'par' && words[2] === 'de') words = ['2', ...words.slice(3)];
  const n0 = words[0]?.replace(',', '.');
  if (n0 && /^\d+([.]\d+)?$/.test(n0)) { qty = Number(n0); words = words.slice(1); }
  else if (n0 && NUMBERS[n0] != null) { qty = NUMBERS[n0]; words = words.slice(1); }
  // «1 y medio» ya lo ha partido splitPhrase: se admite «uno y medio» como 1,5 sólo escrito en cifras
  const u0 = words[0];
  if (u0 && UNIT_WORDS[u0]) { unit = UNIT_WORDS[u0]; words = words.slice(1); }
  if (words[0] === 'de') words = words.slice(1);
  // «2 cañas», «un tercio»: la ración ES lo que se toma
  if (!words.length && unit && u0) words = [u0];
  const name = words.join(' ');
  if (!name) return null;
  const hit = searchFoods(name, extras, 1)[0];
  if (!hit) return null;
  const units = hit.u || [['ración', 100]];
  let grams;
  if (unit === 'g') grams = qty;
  else if (unit === 'kg') grams = qty * 1000;
  else {
    const found = unit && units.find(([un]) => norm(un) === norm(unit));
    const [uName, uGrams] = found || units[0];
    unit = uName;
    grams = qty * uGrams;
  }
  return { item: hit, qty: unit === 'g' || unit === 'kg' ? 1 : qty, unit: unit === 'kg' ? 'g' : unit, grams };
}

/* «una tostada con aceite»: si con el «con» no hay un plato en la tabla (como
   sí lo hay «café con leche»), son dos cosas: la tostada y el aceite. */
export function parsePhrase(text, extras = []) {
  const parts = [], items = [];
  for (const p of splitPhrase(text)) {
    const whole = parsePart(p, extras);
    if (whole || !/\scon\s/.test(p)) { parts.push(p); items.push(whole); continue; }
    p.split(/\s+con\s+/).forEach(sub => { parts.push(sub); items.push(parsePart(sub, extras)); });
  }
  return { parts, items, understood: items.filter(Boolean).length };
}

// El nombre sin la cantidad ni la ración: «2 platos de lentejas» → «lentejas».
export function stripQty(part) {
  let words = norm(part).split(' ');
  if (words[0] === 'un' && words[1] === 'par' && words[2] === 'de') words = words.slice(3);
  if (/^\d+([.,]\d+)?$/.test(words[0] || '') || NUMBERS[words[0]] != null) words = words.slice(1);
  if (UNIT_WORDS[words[0]] && words.length > 1) words = words.slice(1);
  if (words[0] === 'de') words = words.slice(1);
  return words.join(' ');
}

// Lo que aporta una cantidad de un alimento.
export function nutrientsFor(item, grams) {
  const r = grams / 100;
  return { kcal: item.k * r, p: item.p * r, c: item.c * r, f: item.f * r };
}
