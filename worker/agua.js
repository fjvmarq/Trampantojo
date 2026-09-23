/* Trampantojo — el servidor de los avisos de agua (Cloudflare Worker, gratis).

   Una web en Android no puede programar alarmas: con la app cerrada, sólo le
   llega lo que le manden. Este Worker es quien manda: cada 15 minutos mira a
   cada móvil dado de alta y, si toca (la misma regla que js/agua.js), le envía
   un aviso web push. El aviso va VACÍO: el móvil pone el texto con lo que sabe
   él (cuántos vasos llevas), así que aquí no viaja nada tuyo.

   Lo que guarda por móvil (en KV, clave «u:<código>»): la suscripción push,
   tu horario (desde, hasta, cada cuánto, objetivo, zona horaria), el día, los
   vasos de hoy y la hora del último vaso y del último aviso. Ni nombre, ni
   peso, ni nada más. «Silenciar para siempre» borra la entrada; y aunque no
   llegara aquí, el móvil da de baja la suscripción y el siguiente envío
   devuelve 410, con lo que la entrada se borra sola.

   Variables: AGUA (KV), VAPID_PUBLIC (texto, base64url), VAPID_PRIVATE_JWK
   (secreto, JSON), VAPID_SUBJECT (opcional). */

const ORIGINS = ['https://fjvmarq.github.io', 'http://localhost:8791'];
// sólo se envía a servicios de push de verdad (nunca a una URL cualquiera)
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/, /^web\.push\.apple\.com$/, /\.push\.apple\.com$/];

/* ── la regla (la misma que js/agua.js · shouldRemind) ──────────────────── */

export function shouldRemind({ hour, count, goal, from, to, every, minsSinceGlass, minsSinceReminder }) {
  if (hour < from || hour >= to) return false;
  if (count >= goal) return false;
  const gap = every * 60;
  const sinceGlass = Math.min(minsSinceGlass ?? Infinity, (hour - from) * 60);
  if (sinceGlass < gap) return false;
  if (minsSinceReminder != null && minsSinceReminder < gap) return false;
  return true;
}

// La hora y el día en la zona horaria del móvil.
export function localNow(tz, now = new Date()) {
  let parts;
  try {
    parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: tz || 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(now).map(p => [p.type, p.value]));
  } catch {
    return localNow('Europe/Madrid', now);
  }
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) + Number(parts.minute) / 60 };
}

// ¿Le toca un aviso a este móvil ahora?
export function due(u, now = new Date()) {
  if (!u?.cfg) return false;
  const { day, hour } = localNow(u.cfg.tz, now);
  const today = u.day === day;
  const mins = t => (t ? (now.getTime() - t) / 60000 : null);
  return shouldRemind({
    hour, count: today ? u.count || 0 : 0, goal: u.cfg.goal || 8,
    from: u.cfg.from ?? 10, to: u.cfg.to ?? 21, every: u.cfg.every || 2,
    minsSinceGlass: today ? mins(u.last) : null, minsSinceReminder: mins(u.lastSent),
  });
}

/* ── web push con VAPID (RFC 8292), sin cuerpo ──────────────────────────── */

const b64u = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uText = s => b64u(new TextEncoder().encode(s));

export async function vapidJwt(endpoint, privateJwk, subject, now = Date.now()) {
  const header = b64uText(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims = b64uText(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject }));
  const key = await crypto.subtle.importKey('jwk', { ...privateJwk, key_ops: ['sign'], ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${header}.${claims}`));
  return `${header}.${claims}.${b64u(sig)}`;
}

async function sendPush(sub, env) {
  const jwt = await vapidJwt(sub.endpoint, JSON.parse(env.VAPID_PRIVATE_JWK), env.VAPID_SUBJECT || 'https://fjvmarq.github.io/Trampantojo/');
  return fetch(sub.endpoint, {
    method: 'POST',
    headers: { TTL: '3600', Urgency: 'normal', Topic: 'agua', Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC}` },
  });
}

/* ── lo que pide la app ─────────────────────────────────────────────────── */

const okId = id => typeof id === 'string' && /^[0-9a-f]{16,64}$/.test(id);
const okDay = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
const num = (v, lo, hi, dflt) => (Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Number(v))) : dflt);

function cleanCfg(c = {}) {
  return {
    from: num(c.from, 0, 23, 10), to: num(c.to, 1, 24, 21), every: num(c.every, 0.5, 6, 2), goal: num(c.goal, 1, 20, 8),
    tz: typeof c.tz === 'string' && c.tz.length < 64 ? c.tz : 'Europe/Madrid',
  };
}

function okSub(sub) {
  try {
    const u = new URL(sub?.endpoint);
    return u.protocol === 'https:' && PUSH_HOSTS.some(r => r.test(u.hostname)) && JSON.stringify(sub).length < 2000;
  } catch { return false; }
}

function cors(req) {
  const o = req.headers.get('origin');
  return {
    'access-control-allow-origin': ORIGINS.includes(o) ? o : ORIGINS[0],
    'access-control-allow-methods': 'POST, GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

const json = (req, body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors(req) } });

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
    const path = new URL(req.url).pathname;
    if (req.method === 'GET') return json(req, { app: 'Trampantojo', que: 'avisos de agua', ok: true });
    if (req.method !== 'POST') return json(req, { error: 'método' }, 405);
    let b;
    try { b = await req.json(); } catch { return json(req, { error: 'json' }, 400); }
    if (!okId(b?.id)) return json(req, { error: 'id' }, 400);
    const key = `u:${b.id}`;

    if (path === '/alta') {
      if (!okSub(b.sub)) return json(req, { error: 'suscripción' }, 400);
      const prev = await env.AGUA.get(key, 'json');
      await env.AGUA.put(key, JSON.stringify({
        sub: b.sub, cfg: cleanCfg(b.cfg), day: okDay(b.day) ? b.day : prev?.day || null,
        count: num(b.count, 0, 50, 0), last: prev?.last || null, lastSent: prev?.lastSent || null, created: prev?.created || Date.now(),
      }));
      return json(req, { ok: true });
    }
    if (path === '/vaso') {
      const u = await env.AGUA.get(key, 'json');
      if (!u) return json(req, { ok: false, error: 'no está de alta' }, 404);
      const t = num(b.t, 0, Date.now() + 60000, Date.now());
      await env.AGUA.put(key, JSON.stringify({ ...u, day: okDay(b.day) ? b.day : u.day, count: num(b.count, 0, 50, u.count || 0), last: Math.max(u.last || 0, t) }));
      return json(req, { ok: true });
    }
    if (path === '/ajustes') {
      const u = await env.AGUA.get(key, 'json');
      if (!u) return json(req, { ok: false, error: 'no está de alta' }, 404);
      await env.AGUA.put(key, JSON.stringify({ ...u, cfg: cleanCfg(b.cfg) }));
      return json(req, { ok: true });
    }
    if (path === '/baja') {
      await env.AGUA.delete(key);
      return json(req, { ok: true });
    }
    return json(req, { error: 'ruta' }, 404);
  },

  // cada 15 minutos (el cron está en wrangler.toml)
  async scheduled(event, env, ctx) {
    const now = new Date(event.scheduledTime || Date.now());
    let cursor;
    do {
      const page = await env.AGUA.list({ prefix: 'u:', cursor });
      for (const k of page.keys) {
        const u = await env.AGUA.get(k.name, 'json');
        if (!u || !due(u, now)) continue;
        try {
          const r = await sendPush(u.sub, env);
          if (r.status === 404 || r.status === 410) await env.AGUA.delete(k.name);   // se dio de baja en el móvil
          else if (r.ok) await env.AGUA.put(k.name, JSON.stringify({ ...u, lastSent: now.getTime() }));
          else console.warn('push', r.status, await r.text());
        } catch (err) { console.warn('push', err); }
      }
      cursor = page.list_complete ? null : page.cursor;
    } while (cursor);
  },
};
