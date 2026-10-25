// Procedural props v2: displaced organic rocks/foliage, wind-swayed vegetation,
// buildings, shrines, castle pieces, resource nodes.
import * as THREE from 'three';
import { G, M } from './materials.js';
import { makeSwayMaterial } from './wind.js';

const WOOD = () => M(0x6a4a30, { rough: 0.9 });
const DARKWOOD = () => M(0x3e2c1c, { rough: 0.9 });
const STONE = () => M(0x8a8478, { rough: 0.95 });
const PLASTER = () => M(0xd8d0bc, { rough: 0.9 });
const ROOF = () => M(0x4a4440, { rough: 0.85 });
const VERMILION = () => M(0xc4442e, { rough: 0.7 });
const PAPER = () => new THREE.MeshStandardMaterial({ color: 0xffe8b0, emissive: 0xffb050, emissiveIntensity: 1.6, roughness: 0.6 });

function mesh(parent, geo, mat, x, y, z, ry = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

// ---- displaced organic geometry variants (cached) -------------------------
const _displacedCache = new Map();
export function displacedIco(radius, detail, amp, seed) {
  const key = `${radius}|${detail}|${amp}|${seed}`;
  if (_displacedCache.has(key)) return _displacedCache.get(key);
  let geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  let s = seed * 2654435761 % 2147483647 || 1;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const grads = [];
  for (let i = 0; i < 8; i++) grads.push(new THREE.Vector3(rnd() - 0.5, rnd() * 0.6 - 0.1, rnd() - 0.5).normalize());
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    let d = 0;
    for (const g of grads) d += Math.sin(n.dot(g) * 6.2831 + rnd() * 0.4) * 0.5 + 0.5;
    d = (d / grads.length - 0.5) * 2; // -1..1
    const len = radius * (1 + d * amp);
    pos.setXYZ(i, n.x * len, n.y * len, n.z * len);
  }
  geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  _displacedCache.set(key, geo);
  return geo;
}

// ---- vegetation -----------------------------------------------------------
const PINE_GREENS = [0x2e5236, 0x35603c, 0x274a30, 0x3a6a42];
const MAPLE_COLORS = [0x9a5a2e, 0xb06a30, 0x8a4a26];

export function makeTree(rng, kind = 'pine') {
  const g = new THREE.Group();
  const h = 3.2 + rng() * 3;
  const trunkMat = M(0x5a4230, { rough: 0.95 });
  // trunk with taper + slight lean
  const trunk = mesh(g, G('cyl', 0.16, 0.3, h, 7), trunkMat, 0, h / 2, 0);
  trunk.rotation.z = (rng() - 0.5) * 0.08;
  // a branch or two
  const branches = 1 + (rng() * 2 | 0);
  for (let i = 0; i < branches; i++) {
    const bh = h * (0.45 + rng() * 0.35);
    const br = mesh(g, G('cyl', 0.05, 0.09, 1.1 + rng() * 0.7, 5), trunkMat, (rng() - 0.5) * 0.5, bh, (rng() - 0.5) * 0.5);
    br.rotation.set((rng() - 0.5) * 0.9, rng() * 6.28, 0.5 + rng() * 0.4);
  }
  if (kind === 'pine') {
    const leafMat = makeSwayMaterial({ color: PINE_GREENS[(rng() * PINE_GREENS.length) | 0], roughness: 0.88, flatShading: true }, { amp: 0.025, freq: 1.3, heightRef: h });
    let y = h * 0.45, r = 1.5 + rng() * 0.8;
    const tiers = 4 + (rng() * 2 | 0);
    for (let i = 0; i < tiers; i++) {
      const cone = mesh(g, G('cone', r, 1.9, 9), leafMat, (rng() - 0.5) * 0.15, y + 0.95, (rng() - 0.5) * 0.15);
      cone.rotation.z = (rng() - 0.5) * 0.06;
      y += h * 0.13; r *= 0.68;
    }
  } else { // maple: clustered displaced blobs
    const col = MAPLE_COLORS[(rng() * MAPLE_COLORS.length) | 0];
    const leafMat = makeSwayMaterial({ color: col, roughness: 0.85, flatShading: true }, { amp: 0.04, freq: 1.5, heightRef: h });
    const blobs = 4 + (rng() * 3 | 0);
    for (let i = 0; i < blobs; i++) {
      const r = 1.0 + rng() * 1.1;
      const b = mesh(g, displacedIco(r, 1, 0.32, (rng() * 1000) | 0), leafMat,
        (rng() - 0.5) * 1.9, h * 0.82 + (rng() - 0.4) * 1.3, (rng() - 0.5) * 1.9);
      b.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    }
  }
  return g;
}

export function makeRock(rng, scale = 1) {
  const g = new THREE.Group();
  const mat = M(0x847e74 + ((rng() * 0x10) << 4), { rough: 0.95, extra: { flatShading: true } });
  const m = mesh(g, displacedIco(1, 1, 0.38, (rng() * 1000) | 0), mat, 0, 0.38 * scale, 0);
  m.scale.set(scale * (0.85 + rng() * 0.6), scale * (0.55 + rng() * 0.5), scale * (0.85 + rng() * 0.6));
  m.rotation.set(rng() * 0.5, rng() * Math.PI * 2, rng() * 0.5);
  return g;
}

export function makeMountain(rng, tint) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: tint, roughness: 1, flatShading: true, envMapIntensity: 0.15 });
  const r = 55 + rng() * 45;
  const m = mesh(g, displacedIco(r, 2, 0.22, (rng() * 1000) | 0), mat, 0, r * 0.18, 0);
  m.scale.y = 0.68 + rng() * 0.5;
  m.rotation.y = rng() * Math.PI * 2;
  // snow cap for tall ones
  if (m.scale.y > 0.95) {
    const cap = mesh(g, displacedIco(r * 0.45, 1, 0.2, (rng() * 1000) | 0), M(0xe8ecf0, { rough: 0.9, extra: { flatShading: true } }), 0, r * 0.62, 0);
    cap.scale.y = 0.5;
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return g;
}

export function makeBambooField(count, rng) {
  const group = new THREE.Group();
  const stemGeo = G('cyl', 0.05, 0.075, 1, 5);
  const leafGeo = G('cone', 0.16, 0.85, 4);
  const stemMat = makeSwayMaterial({ color: 0x76a04e, roughness: 0.55 }, { amp: 0.09, freq: 1.4, heightRef: 7 });
  const leafMat = makeSwayMaterial({ color: 0x4e8a3e, roughness: 0.7, flatShading: true, side: THREE.DoubleSide }, { amp: 0.16, freq: 1.9, heightRef: 7 });
  const stems = new THREE.InstancedMesh(stemGeo, stemMat, count);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const h = 5 + rng() * 4.5;
    e.set((rng() - 0.5) * 0.1, rng() * Math.PI * 2, (rng() - 0.5) * 0.1);
    q.setFromEuler(e);
    s.set(1, h, 1);
    p.set(0, h / 2, 0);
    m4.compose(p, q, s);
    stems.setMatrixAt(i, m4);
    e.set(0.35 + rng() * 0.5, rng() * Math.PI * 2, (rng() - 0.5) * 0.8);
    q.setFromEuler(e);
    s.set(1, 1, 1);
    p.set(0, h * 0.92, 0);
    m4.compose(p, q, s);
    leaves.setMatrixAt(i, m4);
  }
  stems.castShadow = true; leaves.castShadow = true;
  group.add(stems, leaves);
  return group;
}

export function makeLantern(lit = true) {
  const g = new THREE.Group();
  const base = mesh(g, G('cyl', 0.22, 0.32, 0.5, 8), STONE(), 0, 0.25, 0);
  base.rotation.x = 0.03;
  mesh(g, G('cyl', 0.3, 0.34, 0.12, 8), STONE(), 0, 0.56, 0);
  mesh(g, G('box', 0.42, 0.5, 0.42), STONE(), 0, 0.9, 0);
  const w = mesh(g, G('box', 0.3, 0.34, 0.3), lit ? PAPER() : M(0x2a2a28), 0, 0.9, 0);
  w.scale.setScalar(1.02);
  mesh(g, G('cyl', 0.3, 0.36, 0.14, 8), STONE(), 0, 1.22, 0);
  // curled top
  const top = mesh(g, G('cone', 0.32, 0.22, 8), STONE(), 0, 1.4, 0);
  top.rotation.z = 0.06;
  if (lit) {
    const light = new THREE.PointLight(0xffa050, 3.2, 7, 1.8);
    light.position.y = 0.95;
    g.add(light);
  }
  return g;
}

export function makeHouse(rng, tint = 0xd8d0bc) {
  const g = new THREE.Group();
  const w = 4 + rng() * 2, d = 5 + rng() * 2, h = 2.4;
  mesh(g, G('box', w, 0.25, d), STONE(), 0, 0.12, 0); // stone foundation
  mesh(g, G('box', w - 0.2, h, d - 0.2), M(tint), 0, h / 2 + 0.2, 0);
  // wooden corner posts
  for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    mesh(g, G('box', 0.18, h, 0.18), DARKWOOD(), px * (w / 2 - 0.12), h / 2 + 0.2, pz * (d / 2 - 0.12));
  }
  // roof (prism via 2 slabs + ridge)
  const rl = Math.hypot(w / 2, 1.7) + 0.5;
  const r1 = mesh(g, G('box', rl, 0.18, d + 0.9), ROOF(), -w / 4, h + 0.85, 0);
  r1.rotation.z = Math.atan2(1.7, w / 2);
  const r2 = mesh(g, G('box', rl, 0.18, d + 0.9), ROOF(), w / 4, h + 0.85, 0);
  r2.rotation.z = -Math.atan2(1.7, w / 2);
  mesh(g, G('box', 0.44, 0.52, d + 0.8), ROOF(), 0, h + 1.56, 0);
  // door + paper windows
  mesh(g, G('box', 1.0, 1.65, 0.1), DARKWOOD(), 0, 0.95, d / 2 + 0.02);
  mesh(g, G('box', 0.85, 0.75, 0.08), PAPER(), -w / 3, 1.45, d / 2 + 0.02);
  mesh(g, G('box', 0.85, 0.75, 0.08), PAPER(), w / 3, 1.45, d / 2 + 0.02);
  mesh(g, G('box', 0.85, 0.75, 0.08), PAPER(), -w / 3, 1.45, -d / 2 - 0.02);
  return { group: g, half: Math.max(w, d) / 2 + 0.4 };
}

export function makeTorii(scale = 1) {
  const g = new THREE.Group();
  const pillarGeo = G('cyl', 0.22 * scale, 0.26 * scale, 4.4 * scale, 10);
  mesh(g, pillarGeo, VERMILION(), -1.5 * scale, 2.2 * scale, 0, 0.04);
  mesh(g, pillarGeo, VERMILION(), 1.5 * scale, 2.2 * scale, 0, -0.04);
  mesh(g, G('cyl', 0.34 * scale, 0.34 * scale, 0.22 * scale, 10), STONE(), -1.5 * scale, 0.11 * scale, 0);
  mesh(g, G('cyl', 0.34 * scale, 0.34 * scale, 0.22 * scale, 10), STONE(), 1.5 * scale, 0.11 * scale, 0);
  mesh(g, G('box', 4.6 * scale, 0.28 * scale, 0.4 * scale), VERMILION(), 0, 3.5 * scale, 0);
  const top = mesh(g, G('box', 5.4 * scale, 0.32 * scale, 0.55 * scale), VERMILION(), 0, 4.35 * scale, 0);
  top.rotation.z = 0.02;
  mesh(g, G('box', 0.26 * scale, 0.7 * scale, 0.3 * scale), VERMILION(), 0, 3.95 * scale, 0);
  return g;
}

export function makeBanner(color = 0x8a2a2a) {
  const g = new THREE.Group();
  mesh(g, G('cyl', 0.05, 0.06, 3.2, 6), DARKWOOD(), 0, 1.6, 0);
  const clothMat = makeSwayMaterial({ color, roughness: 0.85, side: THREE.DoubleSide }, { amp: 0.12, freq: 2.4, heightRef: 3 });
  const cloth = mesh(g, G('plane', 0.7, 1.9), clothMat, 0, 2.1, 0);
  cloth.rotation.y = 0.3;
  return g;
}

export function makeShrineHall() {
  const g = new THREE.Group();
  mesh(g, G('box', 10, 0.6, 8), STONE(), 0, 0.3, 0);
  for (const [x, z] of [[-4, -3], [4, -3], [-4, 3], [4, 3], [0, -3], [0, 3]]) {
    mesh(g, G('cyl', 0.28, 0.32, 3.6, 10), VERMILION(), x, 2.2, z);
    mesh(g, G('box', 0.5, 0.18, 0.5), STONE(), x, 0.45, z);
  }
  mesh(g, G('box', 8.4, 2.8, 6.4), DARKWOOD(), 0, 1.9, 0);
  const roof1 = mesh(g, G('box', 11.4, 0.3, 9), ROOF(), 0, 4.4, 0);
  roof1.rotation.x = 0.1;
  mesh(g, G('box', 8, 1.1, 4), ROOF(), 0, 5.6, 0);
  mesh(g, G('box', 1.6, 2.4, 0.2), DARKWOOD(), 0, 1.6, 3.21);
  // hanging paper charms
  for (let i = 0; i < 4; i++) {
    mesh(g, G('box', 0.16, 0.5, 0.03), PAPER(), -3 + i * 2, 3.1, 3.24);
  }
  return g;
}

export function makeCampfire() {
  const g = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const st = mesh(g, displacedIco(0.2, 0, 0.3, i * 7), STONE(), Math.cos(a) * 0.58, 0.1, Math.sin(a) * 0.58);
    st.rotation.y = a;
  }
  const log1 = mesh(g, G('cyl', 0.09, 0.09, 0.95, 5), DARKWOOD(), 0, 0.18, 0);
  log1.rotation.z = Math.PI / 2;
  const log2 = mesh(g, G('cyl', 0.09, 0.09, 0.95, 5), DARKWOOD(), 0, 0.18, 0);
  log2.rotation.set(Math.PI / 2, 0, Math.PI / 2.7);
  const flame = mesh(g, G('cone', 0.26, 0.75, 7), new THREE.MeshStandardMaterial({ color: 0xff8a30, emissive: 0xff6a10, emissiveIntensity: 2.6, roughness: 0.4 }), 0, 0.55, 0);
  flame.name = 'flame';
  const flame2 = mesh(g, G('cone', 0.15, 0.45, 6), new THREE.MeshStandardMaterial({ color: 0xffd257, emissive: 0xffb020, emissiveIntensity: 3, roughness: 0.3 }), 0, 0.5, 0);
  flame2.name = 'flame2';
  const light = new THREE.PointLight(0xff9a40, 4, 11, 1.7);
  light.position.y = 1.0;
  g.add(light);
  g.userData.flame = flame;
  g.userData.flame2 = flame2;
  return g;
}

export function makeStatue() {
  const g = new THREE.Group();
  mesh(g, G('box', 1.6, 0.5, 1.6), STONE(), 0, 0.25, 0);
  mesh(g, G('box', 1.0, 1.8, 0.9), M(0x6a6a62, { rough: 0.95 }), 0, 1.4, 0);
  mesh(g, G('sph', 0.32, 10, 8), M(0x6a6a62, { rough: 0.95 }), 0, 2.6, 0);
  const sword = mesh(g, G('box', 0.1, 1.7, 0.05), M(0x74747a, { metal: 0.6, rough: 0.4 }), 0.55, 1.7, 0);
  sword.rotation.z = -0.5;
  return g;
}

export function makeGrave(rng) {
  const g = new THREE.Group();
  const st = mesh(g, G('cyl', 0.22, 0.28, 0.9 + rng() * 0.4, 7), STONE(), 0, 0.5, 0);
  st.rotation.z = (rng() - 0.5) * 0.16;
  mesh(g, G('cyl', 0.3, 0.34, 0.16, 7), STONE(), 0, 1.05, 0);
  return g;
}

export function makeChest() {
  const g = new THREE.Group();
  mesh(g, G('box', 0.9, 0.5, 0.6), DARKWOOD(), 0, 0.25, 0);
  const lid = mesh(g, G('box', 0.9, 0.22, 0.6), WOOD(), 0, 0.6, 0);
  mesh(g, G('box', 0.12, 0.14, 0.04), M(0xb8912e, { metal: 0.8, rough: 0.3 }), 0, 0.45, 0.31);
  g.userData.lid = lid;
  return g;
}

export function makeWallSegment(len = 8, h = 3.2) {
  const g = new THREE.Group();
  mesh(g, G('box', len, 0.4, 1.7), STONE(), 0, 0.2, 0);
  mesh(g, G('box', len, h - 0.4, 1.4), M(0x74706a, { rough: 0.95 }), 0, h / 2 + 0.2, 0);
  mesh(g, G('box', len + 0.4, 0.3, 1.8), ROOF(), 0, h + 0.25, 0);
  return g;
}

export function makeKeepTower() {
  const g = new THREE.Group();
  mesh(g, G('box', 12, 5, 12), M(0x5e5a56, { rough: 0.95 }), 0, 2.5, 0);
  mesh(g, G('box', 10, 4, 10), PLASTER(), 0, 7, 0);
  mesh(g, G('box', 12.6, 0.4, 12.6), ROOF(), 0, 9.2, 0);
  mesh(g, G('box', 8, 3.4, 8), PLASTER(), 0, 11.4, 0);
  mesh(g, G('box', 10.4, 0.4, 10.4), ROOF(), 0, 13.3, 0);
  mesh(g, G('box', 5, 2.6, 5), PLASTER(), 0, 14.8, 0);
  mesh(g, G('box', 7, 0.35, 7), ROOF(), 0, 16.3, 0);
  mesh(g, G('cyl', 0.06, 0.08, 2.2, 5), DARKWOOD(), 0, 17.6, 0);
  const flagMat = makeSwayMaterial({ color: 0x1a1a26, roughness: 0.85, side: THREE.DoubleSide }, { amp: 0.1, freq: 3, heightRef: 1 });
  const flag = mesh(g, G('plane', 1.4, 0.8), flagMat, 0.7, 18.3, 0);
  flag.name = 'flag';
  return g;
}

export function makeCastleGate() {
  const g = new THREE.Group();
  mesh(g, G('box', 3.4, 7, 3), M(0x5e5a56, { rough: 0.95 }), -4.5, 3.5, 0);
  mesh(g, G('box', 3.4, 7, 3), M(0x5e5a56, { rough: 0.95 }), 4.5, 3.5, 0);
  mesh(g, G('box', 12.4, 2.2, 3.4), M(0x5e5a56, { rough: 0.95 }), 0, 8.1, 0);
  mesh(g, G('box', 13, 0.5, 4), ROOF(), 0, 9.4, 0);
  mesh(g, G('box', 5.4, 5.6, 0.5), DARKWOOD(), 0, 2.8, 0);
  for (let i = 0; i < 4; i++) mesh(g, G('box', 0.16, 5.6, 0.56), M(0x8a8a90, { metal: 0.5, rough: 0.4 }), -1.9 + i * 1.27, 2.8, 0);
  return g;
}

// Resource nodes (gatherable). Variant visual per type.
export function makeNode(type, rng) {
  const g = new THREE.Group();
  switch (type) {
    case 'bamboo_node': {
      const stemMat = makeSwayMaterial({ color: 0x7a9a4e, roughness: 0.55 }, { amp: 0.07, freq: 1.6, heightRef: 4 });
      for (let i = 0; i < 3; i++) {
        const s = mesh(g, G('cyl', 0.05, 0.06, 3.4 + rng(), 5), stemMat, (i - 1) * 0.3, 1.7, (rng() - 0.5) * 0.4);
        s.rotation.z = (rng() - 0.5) * 0.1;
      }
      break;
    }
    case 'ore_node': {
      mesh(g, displacedIco(0.8, 1, 0.3, (rng() * 1000) | 0), STONE(), 0, 0.4, 0);
      const oreMat = new THREE.MeshStandardMaterial({ color: 0x9a6a4a, metalness: 0.65, roughness: 0.35, emissive: 0x351408, emissiveIntensity: 0.4 });
      for (let i = 0; i < 5; i++) {
        const c = mesh(g, displacedIco(0.16, 0, 0.4, (rng() * 1000) | 0), oreMat, (rng() - 0.5) * 1.1, 0.4 + rng() * 0.7, (rng() - 0.5) * 1.1);
        c.name = 'oreBit';
      }
      break;
    }
    case 'herb_node': {
      for (let i = 0; i < 6; i++) {
        const b = mesh(g, G('cone', 0.1, 0.5, 5), M(0x4a9a3e), (rng() - 0.5) * 0.5, 0.25, (rng() - 0.5) * 0.5);
        b.rotation.z = (rng() - 0.5) * 0.4;
      }
      const bud = mesh(g, G('sph', 0.07, 6, 5), new THREE.MeshStandardMaterial({ color: 0xd8e88a, emissive: 0x8a9a30, emissiveIntensity: 0.7, roughness: 0.5 }), 0, 0.55, 0);
      break;
    }
    case 'ember_node': {
      mesh(g, displacedIco(0.4, 1, 0.25, (rng() * 1000) | 0), new THREE.MeshStandardMaterial({ color: 0xff5a20, emissive: 0xff3a00, emissiveIntensity: 2, roughness: 0.4 }), 0, 0.3, 0);
      break;
    }
  }
  return g;
}

export function makeArrow(ang = 0) {
  const g = new THREE.Group();
  mesh(g, G('cyl', 0.012, 0.012, 0.7, 4), WOOD(), 0, 0, 0);
  mesh(g, G('cone', 0.03, 0.1, 5), M(0x8a8a92, { metal: 0.7, rough: 0.3 }), 0, 0.4, 0);
  g.rotation.x = Math.PI / 2;
  return g;
}

export function makeFireball() {
  const core = new THREE.Mesh(G('sph', 0.2, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffd257, emissive: 0xff8a10, emissiveIntensity: 3.5, roughness: 0.3 }));
  const outer = new THREE.Mesh(G('sph', 0.3, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff5a20, emissive: 0xff3a00, emissiveIntensity: 1.6, roughness: 0.5, transparent: true, opacity: 0.55 }));
  const g = new THREE.Group();
  g.add(core, outer);
  return g;
}
