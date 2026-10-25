// Framework math: helpers thuần toán học, KHÔNG phụ thuộc three.js hay DOM.
// Game re-export từ module này (web/src/core/utils.js) để giữ tương thích cũ.
export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
export const angleWrap = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
export const angleDamp = (a, b, rate, dt) => a + angleWrap(b - a) * (1 - Math.exp(-rate * dt));
export const randRange = (rng, a, b) => a + rng() * (b - a);
export const dist2D = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);

// PRNG xác định theo seed (dùng cho terrain, scatter, spawn…)
export function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Value noise 2D + fbm, xác định theo seed.
export function makeNoise2D(seed) {
  const rng = mulberry32(seed);
  const size = 256;
  const perm = new Uint8Array(size * 2);
  const grad = new Float32Array(size);
  for (let i = 0; i < size; i++) { perm[i] = i; grad[i] = rng() * 2 - 1; }
  for (let i = size - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < size; i++) perm[i + size] = perm[i];
  const fade = (t) => t * t * (3 - 2 * t);
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const h = (X, Y) => grad[perm[(perm[((X % size) + size) % size] + ((Y % size) + size) % size) & 255]];
    const u = fade(xf), v = fade(yf);
    const a = lerp(h(xi, yi), h(xi + 1, yi), u);
    const b = lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u);
    return lerp(a, b, v);
  }
  return { noise, fbm(x, y, octaves = 4) {
    let v = 0, amp = 0.5, f = 1;
    for (let i = 0; i < octaves; i++) { v += noise(x * f, y * f) * amp; f *= 2.07; amp *= 0.5; }
    return v;
  } };
}

export function formatTime(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
