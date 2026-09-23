/* Trampantojo — el fondo vivo de bimio.tools, tal cual.

   Tres capas, de abajo arriba (el CSS está en app.css, «fondo»):
   · la cuadrícula de delineante, pintada en <html>;
   · las manchas de color (aurora): cinco círculos muy difuminados que van y
     vienen despacio, animados sólo con CSS;
   · la constelación: puntos que derivan y se unen con una línea cuando se
     acercan. Es esto, en un <canvas>.

   Portado de website/assets/site.js (wireHeroCloud) de BIMIO. Se para con la
   app en segundo plano y no existe si el móvil pide «reducir movimiento». */

export function startAmbient() {
  const cv = document.querySelector('.page-cloud');
  if (!cv) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { cv.style.display = 'none'; return; }
  const ctx = cv.getContext('2d');
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  let W = 0, H = 0, nodes = [], raf = 0;

  function seed() {
    // el lienzo es más alto que la pantalla (la capa está sobredimensionada
    // para el paralaje): se mide su caja real, no la ventana
    const r = cv.getBoundingClientRect();
    W = cv.width = Math.max(1, Math.round(r.width * DPR));
    H = cv.height = Math.max(1, Math.round(r.height * DPR));
    const count = Math.max(46, Math.min(150, Math.round(r.width * r.height / 20000)));
    nodes = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.16 * DPR, vy: (Math.random() - 0.5) * 0.16 * DPR,
      });
    }
  }

  function isDark() {
    const t = document.documentElement.dataset.theme;
    return t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function palette() {
    // más marcada en claro (un fondo lavado se traga el azul tenue), más suave en oscuro
    return isDark()
      ? { r: 120, g: 175, b: 255, line: 0.16, dot: 0.5 }
      : { r: 20, g: 90, b: 200, line: 0.18, dot: 0.55 };
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    const p = palette(), m = 165 * DPR;
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    }
    ctx.lineWidth = DPR;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < m) {
          ctx.strokeStyle = `rgba(${p.r},${p.g},${p.b},${(p.line * (1 - d / m)).toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.dot})`;
    for (const n of nodes) { ctx.beginPath(); ctx.arc(n.x, n.y, 1.7 * DPR, 0, 7); ctx.fill(); }
    raf = requestAnimationFrame(frame);
  }
  const start = () => { if (!raf) frame(); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  seed();
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(seed, 200); });
  // con la app en segundo plano no se dibuja nada (el fondo fijo siempre «se ve»)
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });

  // paralaje: la capa entera se desliza un poco al hacer scroll, para que no
  // parezca una imagen congelada. Directo a la variable, sin requestAnimationFrame:
  // en bimio.tools el «ticking» se quedaba enganchado y dejaba de moverse.
  function parallax() {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const prog = Math.min(1, Math.max(0, scrollY / max));
    document.documentElement.style.setProperty('--pa', (prog * -18).toFixed(2) + 'vh');
  }
  addEventListener('scroll', parallax, { passive: true });
  addEventListener('resize', parallax, { passive: true });
  parallax();
  start();
}
