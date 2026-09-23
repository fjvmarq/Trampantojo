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
