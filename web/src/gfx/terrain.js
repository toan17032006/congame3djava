// Terrain v2: high-res heightfield + procedural detail albedo/normal textures + valley AO.
import * as THREE from 'three';

function makeDetailTexture() {
  const s = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#b9b9b4';
  ctx.fillRect(0, 0, s, s);
  // soil speckles
  for (let i = 0; i < 5200; i++) {
    const g = 150 + (Math.random() * 105) | 0;
    ctx.fillStyle = `rgba(${g},${g - 4},${g - 12},${0.16 + Math.random() * 0.2})`;
    ctx.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 1.6, 1 + Math.random() * 1.6);
  }
  // tiny grass blade strokes
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * s, y = Math.random() * s;
    const g = 120 + (Math.random() * 70) | 0;
    ctx.strokeStyle = `rgba(${(g * 0.55) | 0},${g},${(g * 0.45) | 0},0.28)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 3, y - 2 - Math.random() * 3);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeNormalTexture() {
  const s = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const h = new Float32Array(s * s);
  for (let i = 0; i < s * s; i++) h[i] = Math.random();
  // smooth a few passes
  for (let p = 0; p < 2; p++) {
    const out = new Float32Array(s * s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      let acc = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        acc += h[((y + dy + s) % s) * s + ((x + dx + s) % s)]; n++;
      }
      out[y * s + x] = acc / n;
    }
    h.set(out);
  }
  const img = ctx.createImageData(s, s);
  const strong = 2.2;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const hl = h[y * s + ((x - 1 + s) % s)], hr = h[y * s + ((x + 1) % s)];
    const hd = h[((y - 1 + s) % s) * s + x], hu = h[((y + 1 + s) % s) * s + x];
    let nx = (hl - hr) * strong, ny = (hd - hu) * strong, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * s + x) * 4;
    img.data[i] = (nx * 0.5 + 0.5) * 255;
    img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
    img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

let _detailTex = null, _normalTex = null;

function anisotropyFor(world) {
  try { return Math.min(8, world.game.engine.renderer.capabilities.getMaxAnisotropy()); } catch { return 4; }
}

export function buildTerrain(world, def, quality = 'high') {
  const size = def.size;
  const seg = quality === 'ultra' ? 160 : quality === 'low' ? 96 : 128;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);

  if (!_detailTex) _detailTex = makeDetailTexture();
  if (!_normalTex) _normalTex = makeNormalTexture();
  const aniso = anisotropyFor(world);
  _detailTex.anisotropy = aniso;
  _normalTex.anisotropy = aniso;

  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const colors = new Float32Array(pos.count * 3);
  const pal = new THREE.Color(def.palette.grass);
  const pal2 = pal.clone().offsetHSL(0.03, 0.02, -0.06);
  const dirt = new THREE.Color(def.palette.dirt);
  const rock = new THREE.Color(def.palette.rock);
  const pathC = new THREE.Color(def.palette.path);
  const c = new THREE.Color();
  // deterministic per-vertex jitter
  let s = def.seed * 7 + 13;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = world.heightFn(x, z);
    pos.setY(i, y);
    // tile the detail textures across the map (~7m per tile)
    uv.setXY(i, uv.getX(i) * (size / 7), uv.getY(i) * (size / 7));

    const hN = (y - world.baseY) / 14;
    c.copy(pal).lerp(pal2, rnd());
    if (hN > 0.35) c.lerp(rock, Math.min((hN - 0.35) / 0.5, 1));
    if (hN < 0.08) c.lerp(dirt, 0.55);
    const road = Math.max(0, 1 - Math.abs(x - world.roadX) / 5.5) * (1 - Math.abs(z) / (size / 2));
    if (road > 0.01) c.lerp(pathC, road * 0.85);
    // valley + crease AO, subtle vertex jitter
    const ao = 0.78 + 0.22 * Math.min(1, Math.max(0, (y - world.baseY) / 6 + 0.35));
    const j = 0.94 + rnd() * 0.12;
    const a = ao * j;
    colors[i * 3] = c.r * a; colors[i * 3 + 1] = c.g * a; colors[i * 3 + 2] = c.b * a;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: _detailTex,
    normalMap: _normalTex,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughness: 0.96, metalness: 0,
    envMapIntensity: 0.25,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return { mesh, geo, mat };
}
