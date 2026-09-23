"""Trampantojo: dibuja las propuestas de icono (y, con --apply X, los iconos de la app).

    python tools/icons.py            # propuestas.png con las tres opciones
    python tools/icons.py --apply a  # escribe icons/*.png de la opción a (la elegida: «Oro»)

El icon.svg (cabecera, bienvenida, favicon) va a mano y copia la opción a.

Se dibuja a 4x y se reduce: así los bordes salen limpios sin depender de cómo
suaviza cada librería. Amarillo porque es el color favorito de Francis.
"""
import math
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
S = 2048  # lienzo de trabajo

# el amarillo: limón cálido arriba, ámbar abajo
Y_TOP = (255, 222, 74)
Y_BOT = (255, 159, 26)
AMBER_DEEP = (176, 96, 0)
BLUE_1 = (10, 132, 255)   # el azul de BIMIO
BLUE_2 = (48, 176, 199)   # su turquesa
INK = (29, 29, 31)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def tile(maskable=False):
    """El fondo: degradado vertical con un brillo suave arriba."""
    # degradado en diagonal: limón arriba a la izquierda, ámbar abajo a la derecha
    bg = Image.new('RGBA', (S, S))
    d = ImageDraw.Draw(bg)
    for i in range(0, 2 * S, 2):
        d.line([(i, 0), (0, i)], fill=lerp(Y_TOP, Y_BOT, i / (2 * S - 1)) + (255,), width=3)
    # un brillo suave, redondo, arriba a la izquierda (sin bordes que ensucien)
    glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([-S * 0.35, -S * 0.4, S * 0.6, S * 0.45], fill=(255, 250, 225, 34))
    bg = Image.alpha_composite(bg, glow.filter(ImageFilter.GaussianBlur(S * 0.12)))
    mask = Image.new('L', (S, S), 0)
    md = ImageDraw.Draw(mask)
    if maskable:
        md.rectangle([0, 0, S, S], fill=255)
    else:
        md.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.225), fill=255)
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    out.paste(bg, (0, 0), mask)
    return out, mask


def shadow_of(layer, dx, dy, blur, rgba):
    """La sombra de una capa: su silueta difuminada, en `rgba`, desplazada."""
    rgb, alpha = rgba[:3], rgba[3]
    a = layer.split()[3].filter(ImageFilter.GaussianBlur(blur)).point(lambda v: v * alpha // 255)
    sh = Image.new('RGBA', layer.size, rgb + (0,))
    sh.putalpha(a)
    out = Image.new('RGBA', layer.size, (0, 0, 0, 0))
    out.alpha_composite(sh, (int(dx), int(dy)))
    return out


def polyline(draw, pts, width, fill):
    for a, b in zip(pts, pts[1:]):
        draw.line([a, b], fill=fill, width=width)
    r = width / 2
    for p in pts:
        draw.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=fill)


# ── A · Oro: el trazo que baja, blanco y con relieve ─────────────────────
def option_a(maskable=False):
    img, mask = tile(maskable)
    k = 0.62 if maskable else 0.8
    o = S * (1 - k) / 2
    P = lambda x, y: (o + x * k * S, o + y * k * S)
    fg = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(fg)
    # la meta: raya discontinua
    x = 0.08
    while x < 0.92:
        d.line([P(x, 0.8), P(min(x + 0.06, 0.92), 0.8)], fill=(255, 255, 255, 150), width=int(S * 0.02 * k / 0.8))
        x += 0.11
    pts = [P(0.10, 0.2), P(0.30, 0.33), P(0.46, 0.39), P(0.62, 0.55), P(0.80, 0.65)]
    w = int(S * 0.085 * k / 0.8)
    polyline(d, pts, w, (255, 255, 255, 255))
    ex, ey = pts[-1]
    r = w * 1.15
    d.ellipse([ex - r, ey - r, ex + r, ey + r], fill=(255, 255, 255, 255))
    rr = r * 0.45
    d.ellipse([ex - rr, ey - rr, ex + rr, ey + rr], fill=Y_BOT + (255,))
    img = Image.alpha_composite(img, shadow_of(fg, 0, S * 0.018, S * 0.02, AMBER_DEEP + (120,)))
    img = Image.alpha_composite(img, fg)
    return img, mask


# ── B · El ojo: trampantOJO ──────────────────────────────────────────────
def option_b(maskable=False):
    img, mask = tile(maskable)
    k = 0.66 if maskable else 0.84
    cx, cy = S / 2, S * 0.5
    wE, hE = S * 0.40 * k / 0.84, S * 0.235 * k / 0.84   # semiejes de la almendra
    fg = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(fg)
    # almendra: dos arcos (arriba y abajo) que se juntan en las comisuras
    pts_top, pts_bot = [], []
    for i in range(0, 181):
        t = math.radians(i)
        x = cx - wE * math.cos(t)
        pts_top.append((x, cy - hE * math.sin(t) ** 1.25))
        pts_bot.append((x, cy + hE * 0.92 * math.sin(t) ** 1.25))
    almond = pts_top + pts_bot[::-1]
    d.polygon(almond, fill=(255, 255, 255, 255))
    img = Image.alpha_composite(img, shadow_of(fg, 0, S * 0.02, S * 0.025, AMBER_DEEP + (110,)))
    # iris: el azul de BIMIO en degradado, recortado por la almendra
    iris = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ir = hE * 0.98
    icx, icy = cx, cy + hE * 0.02
    for i in range(int(ir), 0, -2):
        t = 1 - i / ir
        ImageDraw.Draw(iris).ellipse([icx - i, icy - i, icx + i, icy + i], fill=lerp(BLUE_2, BLUE_1, min(1, t * 1.6)) + (255,))
    pr = ir * 0.46
    ImageDraw.Draw(iris).ellipse([icx - pr, icy - pr, icx + pr, icy + pr], fill=INK + (255,))
    cr = ir * 0.2
    ImageDraw.Draw(iris).ellipse([icx + ir * 0.18 - cr, icy - ir * 0.42 - cr, icx + ir * 0.18 + cr, icy - ir * 0.42 + cr], fill=(255, 255, 255, 235))
    amask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(amask).polygon(almond, fill=255)
    iris.putalpha(Image.composite(iris.split()[3], Image.new('L', (S, S), 0), amask))
    fg = Image.alpha_composite(fg, iris)
    # un trazo fino que baja bajo el ojo: la tendencia (el guiño a la app)
    d2 = ImageDraw.Draw(fg)
    base_y = cy + hE * 1.55
    line = [(cx - wE * 0.72, base_y - S * 0.035), (cx - wE * 0.2, base_y - S * 0.005), (cx + wE * 0.25, base_y + S * 0.02), (cx + wE * 0.72, base_y + S * 0.055)]
    polyline(d2, line, int(S * 0.028 * k / 0.84), (255, 255, 255, 230))
    ex, ey = line[-1]
    r = S * 0.03 * k / 0.84
    d2.ellipse([ex - r, ey - r, ex + r, ey + r], fill=(255, 255, 255, 255))
    img = Image.alpha_composite(img, fg)
    return img, mask


# ── C · Trampantojo: la línea como una cinta que se sale del icono ───────
def option_c(maskable=False):
    img, mask = tile(maskable)
    k = 0.62 if maskable else 0.8
    o = S * (1 - k) / 2
    P = lambda x, y: (o + x * k * S, o + y * k * S)
    pts = [P(0.08, 0.2), P(0.30, 0.34), P(0.47, 0.4), P(0.64, 0.57), P(0.86, 0.68)]
    w = S * 0.11 * k / 0.8
    depth = S * 0.035 * k / 0.8
    # sombra proyectada sobre el fondo (lejos: la cinta «flota»)
    sh = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ds = ImageDraw.Draw(sh)
    polyline(ds, [(x + S * 0.03, y + S * 0.055) for x, y in pts], int(w), (0, 0, 0, 255))
    img = Image.alpha_composite(img, shadow_of(sh, 0, 0, S * 0.03, AMBER_DEEP + (130,)))
    # canto de la cinta (más oscuro) y cara (blanca con brillo)
    fg = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(fg)
    polyline(d, [(x, y + depth) for x, y in pts], int(w), (232, 170, 60, 255))
    # brillo en la cara: degradado blanco → crema
    grad = Image.new('RGBA', (S, S))
    gd = ImageDraw.Draw(grad)
    for y in range(S):
        gd.line([(0, y), (S, y)], fill=lerp((255, 255, 255), (255, 244, 214), y / (S - 1)) + (255,))
    fmask = Image.new('L', (S, S), 0)
    polyline(ImageDraw.Draw(fmask), pts, int(w), 255)
    face = grad.copy()
    face.putalpha(fmask)
    fg = Image.alpha_composite(fg, face)
    # la bola del final: una esfera (degradado radial) que se apoya en la meta
    ex, ey = pts[-1]
    R = w * 0.95
    ball = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    bd = ImageDraw.Draw(ball)
    for i in range(int(R), 0, -2):
        t = i / R
        bd.ellipse([ex - i + R * 0.18 * (1 - t), ey - i - R * 0.18 * (1 - t), ex + i + R * 0.18 * (1 - t), ey + i - R * 0.18 * (1 - t)],
                   fill=lerp((255, 255, 255), (255, 214, 120), t ** 1.6) + (255,))
    fg = Image.alpha_composite(fg, ball)
    img = Image.alpha_composite(img, fg)
    # la meta, discontinua, por delante del fondo y por detrás de nada
    d3 = ImageDraw.Draw(img)
    x = 0.06
    while x < 0.94:
        d3.line([P(x, 0.86), P(min(x + 0.055, 0.94), 0.86)], fill=(255, 255, 255, 170), width=int(S * 0.018 * k / 0.8))
        x += 0.1
    return img, mask


OPTIONS = {'a': option_a, 'b': option_b, 'c': option_c}
NAMES = {'a': 'A · Oro', 'b': 'B · El ojo', 'c': 'C · Trampantojo 3D'}


def render(opt, size, maskable=False):
    img, mask = OPTIONS[opt](maskable)
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out.resize((size, size), Image.LANCZOS)


def sheet():
    from PIL import ImageFont
    try:
        font = ImageFont.truetype('segoeuib.ttf', 34)
        small = ImageFont.truetype('segoeui.ttf', 22)
    except OSError:
        font = small = ImageFont.load_default()
    W, H = 1500, 760
    im = Image.new('RGBA', (W, H), (245, 245, 247, 255))
    dark = Image.new('RGBA', (W, 230), (0, 0, 0, 255))
    im.paste(dark, (0, H - 230))
    d = ImageDraw.Draw(im)
    for i, opt in enumerate('abc'):
        x0 = 60 + i * 480
        big = render(opt, 300)
        im.alpha_composite(big, (x0 + 60, 40))
        d.text((x0 + 210, 370), NAMES[opt], fill=INK, font=font, anchor='mm')
        d.text((x0 + 210, 410), 'así se ve en la pantalla de inicio', fill=(112, 112, 117), font=small, anchor='mm')
        for j, sz in enumerate((96, 60, 40)):
            im.alpha_composite(render(opt, sz), (x0 + 60 + j * 115, H - 190 + (96 - sz) // 2))
    im.convert('RGB').save(ROOT / 'propuestas-icono.png')
    print('propuestas-icono.png')


def apply(opt):
    render(opt, 192).save(ROOT / 'icons' / 'icon-192.png')
    render(opt, 512).save(ROOT / 'icons' / 'icon-512.png')
    render(opt, 512, maskable=True).save(ROOT / 'icons' / 'maskable-512.png')
    render(opt, 180).save(ROOT / 'icons' / 'apple-touch-icon.png')
    print('iconos de la opción', opt)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == '--apply':
        apply(sys.argv[2].lower())
    else:
        sheet()
