# Trampantojo

Tu peso real, sin trampas. Una app personal para adelgazar: apuntas lo que
pesas cada mañana y te enseña la **tendencia** (lo que de verdad está pasando,
sin el baile diario del agua), tu ritmo real, cuándo llegarás a tu meta y los
números de salud que salen de tu perfil. Con mensajes de ánimo hechos con tus
propios datos.

Estética de la suite **BIMIO**: mismos colores (claro y oscuro), tipografía de
Apple, listas agrupadas tipo Ajustes, control segmentado y el papel
cuadriculado de bimio.tools.

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
| `index.html` | las cuatro pantallas, la bienvenida y la hoja de corregir |
| `css/app.css` | todo el aspecto: las variables de BIMIO arriba, nada de colores sueltos |
| `js/calc.js` | los cálculos, sin pantalla (se prueban en `tests.html`) |
| `js/store.js` | guardar y leer, copias internas, copia en fichero |
| `js/charts.js` | los gráficos en SVG, sin librerías |
| `js/messages.js` | el mensaje del día |
| `js/app.js` | el hilo: pantallas y formularios |
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
