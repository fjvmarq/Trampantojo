"""Trampantojo: pone el mismo número de versión en todos los sitios que lo llevan.

    python tools/version.py            # dice la versión actual
    python tools/version.py 0.2.0      # la cambia en todo

Por qué existe: el navegador del móvil guarda los ficheros de código (JS, CSS)
en su memoria hasta 10 minutos aunque la página ya sea la nueva. Si el HTML
nuevo se junta con un JS viejo, la app se rompe justo después de actualizar.
Con la versión en la dirección de cada fichero (app.js?v=0.2.0) una versión
nueva es, para el navegador, un fichero distinto: nunca se mezclan.

Toca: los ?v= de index.html, tests.html, los import de js/*.js, la lista y el
nombre de la caché de sw.js y la constante VERSION de js/app.js.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
FILES = [ROOT / 'index.html', ROOT / 'tests.html', ROOT / 'sw.js', *sorted((ROOT / 'js').glob('*.js'))]
APP = ROOT / 'js' / 'app.js'


def current():
    m = re.search(r"const VERSION = '([^']+)'", APP.read_text(encoding='utf-8'))
    return m.group(1) if m else None


def set_version(v):
    if not re.fullmatch(r'\d+\.\d+\.\d+', v):
        sys.exit(f'Versión no válida: {v} (usa 1.2.3)')
    for f in FILES:
        text = f.read_text(encoding='utf-8')
        new = text
        # ficheros propios .js/.css con o sin ?v= ya puesto
        new = re.sub(r"((?:\./|js/|css/)[\w-]+\.(?:js|css))(?:\?v=[\d.]+)?(?=['\"])", rf"\1?v={v}", new)
        new = re.sub(r"const VERSION = '[^']+'", f"const VERSION = '{v}'", new)
        new = re.sub(r"const CACHE = 'trampantojo-[^']+'", f"const CACHE = 'trampantojo-{v}'", new)
        if new != text:
            f.write_text(new, encoding='utf-8', newline='\n')
            print('  ', f.relative_to(ROOT))
    print(f'Versión {v}')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(current())
    else:
        set_version(sys.argv[1])
