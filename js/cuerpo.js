/* Trampantojo — el mapa del cuerpo: dónde se nota lo que comes.

   Una silueta sencilla con seis zonas (cabeza, pecho, hígado, barriga, brazos,
   piernas) que se tiñen de rojo, ámbar o verde según lo que diga cada tipo de
   caloría (calidad.js). Si una zona recibe cosas distintas, manda la peor. */

const ZONE_SHAPES = {
  cabeza: '<circle cx="60" cy="22" r="12"/>',
  pecho: '<ellipse cx="60" cy="63" rx="21" ry="11"/>',
  higado: '<ellipse cx="49" cy="85" rx="13" ry="8"/>',
  abdomen: '<ellipse cx="60" cy="106" rx="20" ry="12"/>',
  brazos: '<rect x="16" y="52" width="12" height="62" rx="6"/><rect x="92" y="52" width="12" height="62" rx="6"/>',
  piernas: '<ellipse cx="48" cy="182" rx="8" ry="19"/><ellipse cx="72" cy="182" rx="8" ry="19"/>',
};

export const ZONE_NAMES = { cabeza: 'Cabeza', pecho: 'Corazón y arterias', higado: 'Hígado', abdomen: 'Barriga', brazos: 'Músculo', piernas: 'Piernas' };

const RANK = { bad: 0, meh: 1, good: 2 };

// zones: [{ zone, tone, text }] (bodyZones de calidad.js)
export function bodySvg(zones = []) {
  const worst = {};
  for (const z of zones) {
    if (!worst[z.zone] || RANK[z.tone] < RANK[worst[z.zone]]) worst[z.zone] = z.tone;
  }
  const lit = Object.entries(worst)
    .map(([zone, tone]) => `<g class="bz bz-${tone}">${ZONE_SHAPES[zone] || ''}</g>`)
    .join('');
  return `<svg class="body-map" viewBox="0 0 120 214" role="img" aria-label="Silueta con las partes del cuerpo afectadas">
    <g class="body-sil">
      <circle cx="60" cy="22" r="15"/>
      <rect x="54" y="35" width="12" height="10" rx="4"/>
      <rect x="32" y="43" width="56" height="84" rx="20"/>
      <rect x="14" y="48" width="16" height="70" rx="8"/>
      <rect x="90" y="48" width="16" height="70" rx="8"/>
      <rect x="37" y="118" width="21" height="90" rx="10"/>
      <rect x="62" y="118" width="21" height="90" rx="10"/>
    </g>
    ${lit}
  </svg>`;
}
