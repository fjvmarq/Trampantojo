# Trampantojo

Tu peso real, sin trampas. Una app personal para adelgazar: apuntas lo que
pesas cada mañana y te enseña la **tendencia** (lo que de verdad está pasando,
sin el baile diario del agua), tu ritmo real, cuándo llegarás a tu meta y los
números de salud que salen de tu perfil. Con mensajes de ánimo hechos con tus
propios datos.

Estética de **bimio.tools**, sacada de su propio CSS: los mismos colores, las
tarjetas blancas con borde fino, las etiquetas en mayúsculas espaciadas, los
botones de píldora, el titular con degradado azul-turquesa y el fondo vivo
(cuadrícula de delineante, manchas de color que se mueven y la constelación).
**Claro por defecto**, como la web; en Perfil › Apariencia se elige Oscuro o
Auto (el del móvil). Los desplegables son hojas propias al estilo Apple: los del
navegador salían ilegibles en modo oscuro.

**Todo se queda en el móvil.** Sin cuentas, sin servidor, sin anuncios.

---

## Cómo se instala en el móvil

No está en Google Play: es una **app web instalable** (PWA).

1. Abre la dirección de la app en **Chrome** (Android).
2. Menú **⋮** → **Instalar aplicación** (o «Añadir a la pantalla de inicio»).
3. Ábrela desde el icono. La primera vez, déjala unos segundos con conexión:
   ahí se guarda para funcionar sin ella.

### Las actualizaciones

**No hay que desinstalar nada.** Cada versión nueva llega sola la siguiente vez
que abres la app con conexión. Tus datos no se tocan: viven aparte del código,
y cada versión sabe leer los de las anteriores.

> ⚠️ **No borres los datos del sitio en Chrome sin una copia.** Eso sí borra
> tus pesadas. Si algún día hace falta (por ejemplo, un icono que no abre),
> primero **Perfil › Descargar copia**, y después **Cargar copia**.

### Copia de seguridad

**Perfil › Descargar copia** guarda un fichero `trampantojo-copia-AAAA-MM-DD.json`.
Guárdalo en Drive o mándatelo por correo. **Cargar copia** lo recupera (lo que
hubiera en el móvil se aparta, no se borra). Sirve también para pasar la app a
otro móvil.

**Diagnóstico:** `estado.html` dice, en ese mismo móvil, si el manifiesto
carga, si el service worker está activo y cuántas pesadas hay guardadas.

---

## Qué calcula

| | Cómo |
|---|---|
| Tendencia | Suavizado doble de Holt (10 % el dato del día, 5 % la pendiente). Una media simple se quedaba ~0,6 kg por detrás al bajar medio kilo a la semana |
| Ritmo real | Recta de mínimos cuadrados sobre las pesadas de las últimas 3 semanas (mín. 4 pesadas en 7 días) |
| Fecha de la meta | Kilos que faltan ÷ ritmo real |
| Tu plan | Recta desde donde empezaste hasta tu peso objetivo **en la fecha que elijas** («¿para cuándo?»); el ritmo sale de la fecha, o eliges un ritmo y te pone la fecha. Nunca más de 1 kg/semana. En la gráfica de Hoy («tu camino») es la **línea a seguir**, desde el primer día hasta la bandera de la meta; ±0,5 kg alrededor es ir en tu línea. Cambiar la meta o la fecha lo reinicia desde hoy |
| Objetivos intermedios | Un peso para una fecha («88 kg para Navidad»): un rombo en la gráfica. **Conseguido** si la tendencia llegó antes de la fecha; si no, se mira a dónde llegas a tu ritmo real y cuántos kg/semana harían falta |
| Comidas | Tabla propia de ~200 alimentos y platos españoles con raciones caseras (`js/foods.js`), búsqueda sin tildes y por alias, **frases** («2 huevos y una tostada con aceite»), **código de barras** (Open Food Facts) y **mis platos**. Cada apunte guarda sus kcal calculadas en el momento |
| Gasto real medido | Con 14 días de comidas apuntadas en 4 semanas: media comida + (bajada de la tendencia × 7.700 / días). Se puede usar en vez de la fórmula para el objetivo diario |
| Agua, logros y tu semana | Vasos de un toque en Hoy (8 hombre / 7 mujer). 16 logros calculados de tus datos (`js/logros.js`), con aviso al conseguir uno. «Esta semana» en Evolución y el lunes en el mensaje del día |
| Ideas de comida | En Comidas, para la siguiente comida sin apuntar: platos de casa (`js/ideas.js`) que cuadran con lo que te queda de kcal, con preferencia por la proteína si vas corto, sin tus alergias ni lo que no te gusta. Se apuntan de un toque |
| Tengo un antojo | Qué te apetece, tres preguntas (hambre, cómo estás, sueño) y **por qué te pasa**: con lo que llevas comido hoy (horas sin comer, proteína, si has comido poco) o, sin comidas apuntadas, por lo psicológico (estrés, aburrimiento, sueño, costumbre de esa hora, la noche). Lo que cuesta (kcal, minutos andando, % de lo que queda), tus razones y tres salidas: esperar 10 minutos, una alternativa sana (respeta alergias y lo que no te gusta) o comértelo con cabeza |
| Análisis de antojos | Cruza tus antojos con tus comidas de los últimos 60 días: desayuno pobre, poca proteína, comer muy poco, sueño, tu disparador más habitual, horas tras la última comida y tu momento difícil. Sólo afirma lo que los datos sostienen (≥3 días por grupo, diferencia ×1,5) |
| IMC y peso saludable | Zonas de la OMS (18,5 – 24,9) |
| Metabolismo basal | Mifflin-St Jeor |
| Gasto diario | Basal × actividad (1,2 · 1,375 · 1,55 · 1,725 · 1,9), con sugerencia a partir de tus hábitos |
| Calorías objetivo | Gasto − ritmo × 7.700 / 7, **nunca por debajo de 1.500 (hombre) / 1.200 (mujer)** |
| Cintura/altura | Por debajo de 0,5 es la señal buena |
| % de grasa | Método de la Marina de EE. UU. (cinta métrica) |
| Proteína y agua | 1,2–1,6 g/kg de peso objetivo · EFSA (2,5 L / 2,0 L) |

Es orientativo: no sustituye a un médico.

---

## Para desarrollar

Sin compilación, sin dependencias, sin npm: HTML, CSS y JavaScript a pelo.

```bash
python -m http.server 8791
```

- `tests.html` — las pruebas de los cálculos, en el navegador (deben salir todas en verde).
- `estado.html` — diagnóstico.

| Fichero | Qué hace |
|---|---|
| `index.html` | las cuatro pantallas, la bienvenida y las hojas de corregir pesada y de objetivo |
| `css/app.css` | todo el aspecto: las variables de BIMIO arriba, nada de colores sueltos |
| `js/calc.js` | los cálculos, sin pantalla (se prueban en `tests.html`) |
| `js/store.js` | guardar y leer, copias internas, copia en fichero |
| `js/charts.js` | los gráficos en SVG, sin librerías |
| `js/foods.js` | la tabla de alimentos, la búsqueda y las frases (se prueban en `tests.html`) |
| `js/comidas.js` | la pantalla de Comidas: apuntar, código de barras, mis platos |
| `js/antojo.js` | el antojo: por qué te pasa, lo que cuesta, alternativas y el análisis a largo plazo (se prueba en `tests.html`) |
| `js/antojo-ui.js` | la hoja de «Tengo un antojo» y la tarjeta de antojos |
| `js/messages.js` | el mensaje del día |
| `js/app.js` | el hilo: pantallas, formularios, selectores y tema |
| `js/ambient.js` | el fondo vivo (constelación y paralaje), portado de bimio.tools |
| `sw.js` | funcionar sin conexión |
| `tools/version.py` | sube la versión en todos los sitios a la vez |

### Publicar una versión

```bash
python tools/version.py 0.2.0
```

y subir. **Siempre** con el script: pone la versión en la dirección de cada
fichero (`app.js?v=0.2.0`). Sin eso, el navegador puede tener el JS viejo en
memoria hasta 10 minutos con el HTML nuevo, y la app se rompe justo al
actualizar. Pasó durante el desarrollo.

### Reglas que han costado un disgusto (aquí o en Kids Routines)

- **Leer tiene tres respuestas: hay datos · no hay nada · no he podido leer.**
  Tras una lectura fallida, la app **no guarda**: pisaría lo que había.
- **Antes de guardar se aparta la versión anterior** (una por día, las últimas 7).
- **Los datos llevan versión** y `migrate()` sabe leer todas las anteriores.
  Nunca se quita un campo que no se conoce.
- **Todas las claves empiezan por `trampantojo:`**: el dominio puede ser
  compartido con otras apps.
- **El service worker guarda fichero a fichero** (nunca `addAll`), **la red
  manda para el código**, y `estado.html` y `tests.html` no se guardan nunca.
- **En el manifiesto, nada de `display_override` ni `orientation`**: en Android
  dejaban un icono instalado que no abría.
