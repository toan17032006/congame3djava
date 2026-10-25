// Instanced grass field with per-blade tint, wind sway and patchy distribution.
import * as THREE from 'three';
import { makeSwayMaterial } from './wind.js';

const GRASS_COUNTS = { ultra: 24000, high: 15000, medium: 7000, low: 0 };
const MAX_GRASS = 24000;

function bladeGeometry() {
  // two crossed quads, 4 height rows, slight forward curve, tapered; normals up for soft lighting
  const rows = 4, h = 0.62;
  const quads = [
    { rot: 0 },
    { rot: Math.PI / 2 },
  ];
  const positions = [], normals = [], colors = [], uvs = [], indices = [];
  let vi = 0;
  for (const q of quads) {
    const cos = Math.cos(q.rot), sin = Math.sin(q.rot);
    for (let r = 0; r <= rows; r++) {
      const t = r / rows;
      const y = t * h;
      const halfW = 0.045 * (1 - t * 0.75);
      const bend = t * t * 0.14;
      for (let sx = -1; sx <= 1; sx += 2) {
        const lx = sx * halfW;
        positions.push(lx * cos - bend * sin, y, lx * sin + bend * cos);
        normals.push(0, 1, 0);
        const shade = 0.55 + t * 0.55;
        colors.push(shade, shade, shade);
        uvs.push(0, t);
      }
    }
    for (let r = 0; r < rows; r++) {
      const a = vi + r * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
    vi += (rows + 1) * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

export function buildGrass(world, def, rng, noise, quality = 'high') {
  const count = GRASS_COUNTS[quality] ?? 0;
  if (count <= 0) return null;
  const geo = bladeGeometry();
  const mat = makeSwayMaterial(
    { vertexColors: true, side: THREE.DoubleSide, roughness: 0.9, metalness: 0, envMapIntensity: 0.3 },
    { amp: 0.075, freq: 2.1, heightRef: 0.62 },
  );
  const mesh = new THREE.InstancedMesh(geo, mat, MAX_GRASS);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;

  const size = def.size, half = size / 2;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const base = new THREE.Color(def.palette.grass);
  const dry = base.clone().offsetHSL(0.05, -0.05, 0.16);
  const tmp = new THREE.Color();
  let placed = 0, tries = 0;
  const maxTry = MAX_GRASS * 6;
  while (placed < MAX_GRASS && tries < maxTry) {
    tries++;
    const x = (rng() - 0.5) * size * 0.96;
    const z = (rng() - 0.5) * size * 0.96;
    // keep the road, landmarks and steep slopes clear
    if (Math.abs(x - world.roadX) < 3.6 && Math.abs(z) < half * 0.72) continue;
    if (Math.hypot(x, z) < 10) continue;
    const gy = world.heightFn(x, z);
    const gx = world.heightFn(x + 1.2, z) - world.heightFn(x - 1.2, z);
    const gz = world.heightFn(x, z + 1.2) - world.heightFn(x, z - 1.2);
    if (Math.hypot(gx, gz) > 1.5) continue;
    if (noise.fbm(x * 0.045 + 31, z * 0.045 + 31, 3) < -0.12) continue; // patchy
    let blocked = false;
    for (const c of world.colliders) {
      if (Math.hypot(x - c.x, z - c.z) < c.r + 0.55) { blocked = true; break; }
    }
    if (blocked) continue;
    e.set((rng() - 0.5) * 0.25, rng() * Math.PI * 2, (rng() - 0.5) * 0.25);
    q.setFromEuler(e);
    s.set(0.8 + rng() * 0.7, 0.65 + rng() * 0.75, 1);
    p.set(x, gy - 0.03, z);
    m4.compose(p, q, s);
    mesh.setMatrixAt(placed, m4);
    tmp.copy(base).lerp(dry, 0.25 + noise.fbm(x * 0.09, z * 0.09, 2) * 0.5 + rng() * 0.25);
    tmp.offsetHSL(0, 0, (rng() - 0.5) * 0.06);
    mesh.setColorAt(placed, tmp);
    placed++;
  }
  mesh.count = Math.min(count, placed);
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return { mesh, geo, mat };
}
