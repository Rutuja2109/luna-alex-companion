// Original illustrated avatar (SVG). Every part is drawn here from simple
// shapes; nothing is traced from any app. look = {
//   body: 'f'|'m', skin, face: 'oval'|'round'|'soft', eyes (iris colour),
//   hair: style id, hairColor, brows, facial: 'none'|'stubble'|'beard',
//   top: style id, topColor, glasses, earrings }

export const SKINS = ['#f6dcc6', '#eec4a3', '#d9a27c', '#b97c55', '#8d5a3b', '#5e3b27'];
export const HAIR_COLORS = ['#2b1d17', '#4a2f22', '#7a4a2c', '#b07a45', '#d9b26f', '#a63d2a', '#7b6f8f', '#e8e2da'];
export const EYES = ['#5a3a22', '#3d6b4f', '#3f6fa6', '#6b6f78', '#2a2321'];
export const TOP_COLORS = ['#f0ece6', '#2d3446', '#c96b5b', '#6f8f7a', '#e2b84f', '#7a6fc4', '#3c5f8a', '#d98fa8'];
export const HAIR_F = [
  { id: 'long', label: 'Long' }, { id: 'wavy', label: 'Wavy' }, { id: 'bob', label: 'Bob' },
  { id: 'bun', label: 'Bun' }, { id: 'curly', label: 'Curly' }, { id: 'pony', label: 'Ponytail' },
];
export const HAIR_M = [
  { id: 'short', label: 'Short' }, { id: 'swoop', label: 'Swept' }, { id: 'curlyshort', label: 'Curls' },
  { id: 'buzz', label: 'Buzz' }, { id: 'messy', label: 'Messy' }, { id: 'long', label: 'Long' },
];
export const TOPS = [
  { id: 'tee', label: 'T-shirt' }, { id: 'sweater', label: 'Knit sweater' }, { id: 'hoodie', label: 'Hoodie' },
  { id: 'shirt', label: 'Shirt' }, { id: 'jacket', label: 'Jacket', coins: 80 }, { id: 'turtle', label: 'Turtleneck', coins: 60 },
];

export function defaultLook(body = 'f') {
  return body === 'm'
    ? { body: 'm', skin: SKINS[2], face: 'soft', eyes: EYES[0], hair: 'swoop', hairColor: HAIR_COLORS[1], facial: 'none', top: 'hoodie', topColor: TOP_COLORS[1], glasses: false, earrings: false }
    : { body: 'f', skin: SKINS[1], face: 'oval', eyes: EYES[0], hair: 'long', hairColor: HAIR_COLORS[2], facial: 'none', top: 'sweater', topColor: TOP_COLORS[0], glasses: false, earrings: true };
}

// colour helpers
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const shade = (h, k) => toHex(hex(h).map((v) => (k < 0 ? v * (1 + k) : v + (255 - v) * k)));

let uidN = 0;

/** Full bust SVG (viewBox 0 0 300 380). opts: {crop:'face'|'bust', cls, title} */
export function avatarSvg(look, { crop = 'bust', cls = '', title = '' } = {}) {
  const L = { ...defaultLook(look?.body), ...look };
  const id = `av${++uidN}`;
  const m = L.body === 'm';
  const skin = L.skin, skinD = shade(skin, -0.16), skinDD = shade(skin, -0.3), skinL = shade(skin, 0.18);
  const hair = L.hairColor, hairD = shade(hair, -0.35), hairL = shade(hair, 0.22);
  const top = L.topColor, topD = shade(top, -0.22), topL = shade(top, 0.12);
  const lips = m ? shade(skin, -0.22) : shade('#c7616a', skin < '#a' ? 0 : -0.1);
  const vb = crop === 'face' ? '50 52 200 200' : '0 0 300 380';

  // ---- face shape
  const faceP = {
    oval: 'M150 74 C204 74 222 116 220 160 C218 204 192 238 150 243 C108 238 82 204 80 160 C78 116 96 74 150 74 Z',
    round: 'M150 76 C208 76 224 118 222 162 C220 206 194 236 150 240 C106 236 80 206 78 162 C76 118 92 76 150 76 Z',
    soft: 'M150 72 C206 72 224 114 222 158 C221 196 206 228 176 240 C164 245 136 245 124 240 C94 228 79 196 78 158 C76 114 94 72 150 72 Z',
  }[L.face] || '';

  // ---- hair (back layer, drawn behind the head) and front layer
  const back = {
    long: `<path d="M72 150 C60 84 102 46 150 46 C200 46 242 84 230 150 C236 226 250 292 264 344 C232 356 206 338 196 306 L104 306 C94 338 68 356 36 344 C50 292 64 226 72 150 Z" fill="url(#${id}h)"/>`,
    wavy: `<path d="M70 150 C58 84 102 44 150 44 C200 44 244 84 232 150 C246 196 236 226 254 262 C270 296 250 330 226 336 C204 340 196 318 192 304 L108 304 C104 318 96 340 74 336 C50 330 30 296 46 262 C64 226 54 196 70 150 Z" fill="url(#${id}h)"/>`,
    bob: `<path d="M68 156 C58 88 102 48 150 48 C198 48 242 88 232 156 C236 196 238 222 228 244 C210 250 196 244 190 236 L110 236 C104 244 90 250 72 244 C62 222 64 196 68 156 Z" fill="url(#${id}h)"/>`,
    pony: `<path d="M206 92 C246 104 262 150 250 214 C244 252 232 282 214 296 C220 254 222 214 214 180 Z" fill="url(#${id}h)"/>`,
    long_m: `<path d="M72 150 C62 86 102 50 150 50 C198 50 238 86 228 150 C232 196 236 232 226 262 C206 266 196 250 192 240 L108 240 C104 250 94 266 74 262 C64 232 68 196 72 150 Z" fill="url(#${id}h)"/>`,
  };
  const backKey = m ? (L.hair === 'long' ? 'long_m' : '') : L.hair;
  const curls = (cx, cy, r, n, rad, a0 = 0, a1 = Math.PI * 2) => [...Array(n)].map((_, i) => { const a = a0 + (i / (n - (a1 - a0 < 6 ? 1 : 0))) * (a1 - a0); return `<circle cx="${(cx + Math.cos(a) * rad).toFixed(1)}" cy="${(cy + Math.sin(a) * rad * 0.8).toFixed(1)}" r="${r}"/>`; }).join('');
  const front = {
    // feminine
    long: `<path d="M76 172 C66 100 108 56 156 58 C206 60 234 102 224 176 C216 134 200 108 176 98 C160 116 116 124 94 120 C84 134 78 152 76 172 Z" fill="url(#${id}h)"/><path d="M176 98 C196 112 212 136 218 168" stroke="${hairD}" stroke-width="2" fill="none" opacity=".5"/>`,
    wavy: `<path d="M74 176 C62 100 106 54 154 56 C206 58 238 100 226 178 C222 150 214 128 200 112 C192 130 168 118 150 104 C132 122 110 126 92 118 C82 136 76 154 74 176 Z" fill="url(#${id}h)"/>`,
    bob: `<path d="M74 176 C64 100 106 56 152 56 C204 56 238 100 226 176 C220 146 210 124 194 112 C168 122 128 120 104 108 C88 124 78 148 74 176 Z" fill="url(#${id}h)"/>`,
    bun: `<circle cx="150" cy="52" r="26" fill="url(#${id}h)"/><path d="M78 160 C70 100 106 64 152 64 C198 64 232 100 222 160 C214 126 196 104 172 98 C150 110 118 110 98 104 C88 118 82 138 78 160 Z" fill="url(#${id}h)"/>`,
    curly: `<g fill="url(#${id}h)">${curls(150, 118, 21, 13, 74, Math.PI * 0.94, Math.PI * 2.06)}${curls(150, 96, 20, 7, 36)}<circle cx="150" cy="92" r="34"/></g><g fill="${hair}">${curls(78, 150, 15, 5, 12)}${curls(222, 150, 15, 5, 12)}</g>`,
    pony: `<path d="M78 162 C70 100 108 60 154 60 C202 62 232 102 222 164 C216 130 198 106 174 98 C150 112 118 112 98 106 C88 120 82 140 78 162 Z" fill="url(#${id}h)"/>`,
    // masculine
    short: `<path d="M80 150 C74 96 108 64 152 64 C198 64 230 96 222 152 C218 130 210 116 198 108 C176 116 130 114 106 106 C92 116 84 132 80 150 Z" fill="url(#${id}h)"/>`,
    swoop: `<path d="M80 154 C70 96 108 58 158 60 C210 62 236 104 222 158 C218 132 212 118 200 110 C178 92 132 116 108 112 C94 120 84 136 80 154 Z" fill="url(#${id}h)"/><path d="M110 112 C140 92 176 86 204 104 C176 98 146 104 120 120 Z" fill="${hairL}" opacity=".5"/>`,
    curlyshort: `<g fill="url(#${id}h)">${curls(150, 96, 17, 14, 56)}<ellipse cx="150" cy="92" rx="58" ry="30"/></g>`,
    buzz: `<path d="M84 140 C82 98 112 70 152 70 C192 70 220 98 218 140 C210 118 190 104 152 102 C114 104 92 118 84 140 Z" fill="${hair}" opacity=".85"/>`,
    messy: `<path d="M78 156 C68 96 104 56 152 58 C202 58 236 98 224 158 C220 136 214 120 204 112 L196 124 L184 108 L170 120 L158 104 L144 118 L130 104 L118 120 L106 110 C92 120 84 136 78 156 Z" fill="url(#${id}h)"/>`,
    long: `<path d="M78 160 C68 98 106 58 152 58 C202 58 236 98 224 160 C218 132 204 112 180 104 C160 116 122 116 104 108 C90 122 82 140 78 160 Z" fill="url(#${id}h)"/>`,
  }[L.hair] || '';

  // ---- tops
  const neckline = {
    tee: `<path d="M124 270 C134 286 166 286 176 270" stroke="${topD}" stroke-width="5" fill="none"/>`,
    sweater: `<path d="M118 268 C130 292 170 292 182 268" stroke="${topD}" stroke-width="10" fill="none" stroke-linecap="round"/>${[...Array(9)].map((_, i) => `<path d="M${70 + i * 20} 318 v60" stroke="${topD}" stroke-width="2" opacity=".35"/>`).join('')}`,
    hoodie: `<path d="M98 272 C112 304 188 304 202 272 C196 262 104 262 98 272 Z" fill="${topD}"/><path d="M136 298 v34 M164 298 v34" stroke="${topL}" stroke-width="3" stroke-linecap="round"/><circle cx="136" cy="334" r="3" fill="${topL}"/><circle cx="164" cy="334" r="3" fill="${topL}"/>`,
    shirt: `<path d="M124 268 L150 300 L176 268 L182 290 L150 306 L118 290 Z" fill="${topL}"/><path d="M150 300 v80" stroke="${topD}" stroke-width="2"/><circle cx="150" cy="322" r="2.5" fill="${topD}"/><circle cx="150" cy="348" r="2.5" fill="${topD}"/>`,
    jacket: `<path d="M126 270 C136 284 164 284 174 270 L176 380 L124 380 Z" fill="#f2efe9"/><path d="M118 268 L150 380 L96 380 C92 340 92 300 104 276 Z M182 268 L150 380 L204 380 C208 340 208 300 196 276 Z" fill="${topD}"/>`,
    turtle: `<rect x="122" y="246" width="56" height="34" rx="12" fill="${topD}"/>${[...Array(5)].map((_, i) => `<path d="M${128 + i * 11} 250 v28" stroke="${top}" stroke-width="2" opacity=".6"/>`).join('')}`,
  }[L.top] || '';
  const shoulders = m
    ? 'M28 380 C30 312 70 280 124 268 L176 268 C230 280 270 312 272 380 Z'
    : 'M46 380 C50 318 84 286 126 272 L174 272 C216 286 250 318 254 380 Z';

  // ---- eyes, brows, mouth
  const eye = (cx, flip) => `<g class="eye" style="transform-origin:${cx}px 164px">
      <path d="M${cx - 15} 164 C${cx - 8} 154 ${cx + 8} 154 ${cx + 15} 164 C${cx + 8} 172 ${cx - 8} 172 ${cx - 15} 164 Z" fill="#fff"/>
      <circle cx="${cx}" cy="164" r="8.2" fill="${L.eyes}"/><circle cx="${cx}" cy="164" r="4.4" fill="#151012"/>
      <circle cx="${cx + 3}" cy="160.5" r="2.4" fill="#fff"/>
      <path d="M${cx - 16} 163 C${cx - 8} 152 ${cx + 8} 152 ${cx + 16} 163" stroke="#2a1c18" stroke-width="${m ? 2.6 : 3.4}" fill="none" stroke-linecap="round"/>
      ${m ? '' : `<path d="M${cx + flip * 15} 161 l${flip * 5} -4" stroke="#2a1c18" stroke-width="2.6" stroke-linecap="round"/>`}
    </g>`;
  const brow = (cx, flip) => `<path d="M${cx - 16} ${m ? 141 : 143} C${cx - 6} ${m ? 134 : 137} ${cx + 6} ${m ? 134 : 137} ${cx + 16} ${m ? 140 : 143}" stroke="${shade(hair, -0.2)}" stroke-width="${m ? 6 : 4}" fill="none" stroke-linecap="round" transform="${flip < 0 ? '' : ''}"/>`;
  const facial = L.facial === 'beard'
    ? `<path d="M88 182 C92 222 116 246 150 248 C184 246 208 222 212 182 C204 206 188 222 170 226 C160 218 140 218 130 226 C112 222 96 206 88 182 Z" fill="${hair}" opacity=".92"/><path d="M128 214 C138 208 162 208 172 214 C162 214 138 214 128 214 Z" fill="${hair}"/>`
    : L.facial === 'stubble' ? `<path d="M92 186 C96 222 118 242 150 244 C182 242 204 222 208 186 C200 214 178 232 150 234 C122 232 100 214 92 186 Z" fill="${hairD}" opacity=".22"/><path d="M132 206 C142 202 158 202 168 206" stroke="${hairD}" stroke-width="5" opacity=".2" stroke-linecap="round"/>` : '';

  return `<svg class="avatar-svg ${cls}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title || 'Companion avatar'}">
  <defs>
    <radialGradient id="${id}s" cx="45%" cy="38%" r="70%"><stop offset="0" stop-color="${skinL}"/><stop offset=".7" stop-color="${skin}"/><stop offset="1" stop-color="${skinD}"/></radialGradient>
    <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hairL}"/><stop offset=".55" stop-color="${hair}"/><stop offset="1" stop-color="${hairD}"/></linearGradient>
    <linearGradient id="${id}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${topL}"/><stop offset="1" stop-color="${top}"/></linearGradient>
  </defs>
  <g class="av-body">
    ${backKey ? back[backKey] : ''}
    <path d="${shoulders}" fill="url(#${id}t)"/>
    <path d="M126 210 L126 270 C136 284 164 284 174 270 L174 210 Z" fill="${skinD}"/>
    <path d="M126 232 C140 250 160 250 174 232 L174 214 L126 214 Z" fill="${skinDD}" opacity=".35"/>
    ${neckline}
    ${L.top === 'jacket' ? '' : ''}
  </g>
  <g class="av-head">
    <ellipse cx="${m ? 79 : 81}" cy="168" rx="12" ry="18" fill="${skinD}"/><ellipse cx="${m ? 221 : 219}" cy="168" rx="12" ry="18" fill="${skinD}"/>
    ${L.earrings ? `<circle cx="80" cy="190" r="4" fill="#e9c46a"/><circle cx="220" cy="190" r="4" fill="#e9c46a"/>` : ''}
    <path d="${faceP}" fill="url(#${id}s)"/>
    <ellipse cx="112" cy="196" rx="15" ry="9" fill="#ef8f8f" opacity="${m ? 0.1 : 0.22}"/><ellipse cx="188" cy="196" rx="15" ry="9" fill="#ef8f8f" opacity="${m ? 0.1 : 0.22}"/>
    ${facial}
    ${brow(118, -1)}${brow(182, 1)}
    ${eye(118, -1)}${eye(182, 1)}
    <path d="M150 168 C148 182 144 190 141 194 C146 198 154 198 159 194" stroke="${skinDD}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/>
    <g class="mouth"><path class="m-smile" d="M131 212 C141 223 159 223 169 212 C159 216 141 216 131 212 Z" fill="${lips}"/><path class="m-line" d="M131 212 C141 222 159 222 169 212" stroke="${shade(lips, -0.25)}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <ellipse class="m-open" cx="150" cy="215" rx="10" ry="6" fill="#5b2730"/></g>
    ${front}
    ${L.glasses ? `<g fill="none" stroke="#2b2b33" stroke-width="3.2"><circle cx="118" cy="164" r="19"/><circle cx="182" cy="164" r="19"/><path d="M137 162 C144 156 156 156 163 162 M99 160 L82 156 M201 160 L218 156"/></g><g fill="#fff" opacity=".12"><circle cx="118" cy="164" r="17"/><circle cx="182" cy="164" r="17"/></g>` : ''}
  </g>
</svg>`;
}

/** Same avatar as an <img>-ready data URL (for small circles). */
export const avatarUrl = (look, crop = 'face') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(avatarSvg(look, { crop }).replace(/class="eye" style="[^"]*"/g, 'class="eye"'));

export const AVATAR_CSS = `
.avatar-svg { display: block; width: 100%; height: 100%; }
.avatar-svg .m-open { opacity: 0; }
.avatar-svg.talking .m-open { animation: talk .26s ease-in-out infinite alternate; }
.avatar-svg.talking .m-smile, .avatar-svg.talking .m-line { opacity: 0; }
@keyframes talk { from { opacity: 1; transform: scaleY(.3); } to { opacity: 1; transform: scaleY(1); } }
.avatar-svg .m-open { transform-origin: 150px 215px; }
.avatar-svg.alive .eye { animation: blink 5.2s infinite; }
@keyframes blink { 0%, 95%, 100% { transform: scaleY(1); } 97% { transform: scaleY(.1); } }
.avatar-svg.alive .av-body, .avatar-svg.alive .av-head { animation: breath 4.6s ease-in-out infinite; transform-origin: 150px 380px; }
@keyframes breath { 50% { transform: translateY(1.6px) scale(1.004); } }
@media (prefers-reduced-motion: reduce) { .avatar-svg.alive .eye, .avatar-svg.alive .av-body, .avatar-svg.alive .av-head { animation: none; } }
`;
