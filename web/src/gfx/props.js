// Procedural props: buildings, vegetation, shrines, castle pieces, resource nodes.
import * as THREE from 'three';
import { G, M } from './materials.js';

const WOOD = () => M(0x6a4a30, { rough: 0.9 });
const DARKWOOD = () => M(0x3e2c1c, { rough: 0.9 });
const STONE = () => M(0x8a8478, { rough: 0.95 });
const PLASTER = () => M(0xd8d0bc, { rough: 0.9 });
const ROOF = () => M(0x4a4440, { rough: 0.85 });
const VERMILION = () => M(0xc4442e, { rough: 0.7 });
const PAPER = () => new THREE.MeshStandardMaterial({ color: 0xffe8b0, emissive: 0xffb050, emissiveIntensity: 1.2, roughness: 0.6 });

function mesh(parent, geo, mat, x, y, z, ry = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function makeTree(rng, kind = 'pine') {
  const g = new THREE.Group();
  const h = 3 + rng() * 3;
  mesh(g, G('cyl', 0.18, 0.28, h, 7), WOOD(), 0, h / 2, 0);
  if (kind === 'pine') {
    const greens = [0x2e5236, 0x35603c, 0x274a30, 0x3a6a42];
    let y = h * 0.55, r = 1.6 + rng() * 0.8;
    for (let i = 0; i < 3; i++) {
      mesh(g, G('cone', r, 1.8, 8), M(greens[(rng() * greens.length) | 0]), 0, y + 0.9, 0);
      y += 1.1; r *= 0.7;
    }
  } else { // maple
    mesh(g, G('sph', 1.4 + rng() * 0.6, 8, 6), M(0x9a5a2e), 0.4, h + 0.6, 0.2);
    mesh(g, G('sph', 1.1 + rng() * 0.5, 8, 6), M(0xb06a30), -0.5, h + 0.2, -0.3);
  }
  return g;
}

export function makeBambooField(count, rng, ghost = false) {
  const group = new THREE.Group();
  const stemGeo = G('cyl', 0.05, 0.07, 1, 5);
  const leafGeo = G('cone', 0.3, 0.9, 5);
  const stemMat = M(0x7a9a4e, { rough: 0.7 });
  const leafMat = M(0x5a8a3e, { rough: 0.8 });
  const stems = new THREE.InstancedMesh(stemGeo, stemMat, count);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const h = 4.5 + rng() * 4;
    const tilt = (rng() - 0.5) * 0.14;
    e.set(tilt, rng() * Math.PI * 2, (rng() - 0.5) * 0.14);
    q.setFromEuler(e);
    s.set(1, h, 1);
    p.set(0, h / 2, 0);
    m4.compose(p, q, s);
    stems.setMatrixAt(i, m4);
    p.set(0, h * 0.92, 0); s.set(1, 1, 1);
    m4.compose(p, q, s);
    leaves.setMatrixAt(i, m4);
  }
  stems.castShadow = true; leaves.castShadow = true;
  group.add(stems, leaves);
  return group;
}

export function makeRock(rng, scale = 1) {
  const g = new THREE.Group();
  const m = mesh(g, G('dode', 1), STONE(), 0, 0.4 * scale, 0);
  m.scale.set(scale * (0.8 + rng() * 0.8), scale * (0.5 + rng() * 0.5), scale * (0.8 + rng() * 0.8));
  m.rotation.set(rng() * 0.4, rng() * Math.PI, rng() * 0.4);
  return g;
}

export function makeLantern(lit = true) {
  const g = new THREE.Group();
  mesh(g, G('cyl', 0.22, 0.3, 0.5, 8), STONE(), 0, 0.25, 0);
  mesh(g, G('cyl', 0.3, 0.34, 0.12, 8), STONE(), 0, 0.56, 0);
  mesh(g, G('box', 0.42, 0.5, 0.42), STONE(), 0, 0.9, 0);
  const w = mesh(g, G('box', 0.3, 0.34, 0.3), lit ? PAPER() : M(0x2a2a28), 0, 0.9, 0);
  w.scale.setScalar(1.02);
  mesh(g, G('cyl', 0.3, 0.36, 0.14, 8), STONE(), 0, 1.22, 0);
  return g;
}

export function makeHouse(rng, tint = 0xd8d0bc) {
  const g = new THREE.Group();
  const w = 4 + rng() * 2, d = 5 + rng() * 2, h = 2.4;
  mesh(g, G('box', w, h, d), M(tint), 0, h / 2, 0);
  // roof (prism via 2 slabs)
  const rl = Math.hypot(w / 2, 1.6) + 0.4;
  const r1 = mesh(g, G('box', rl, 0.16, d + 0.8), ROOF(), -w / 4, h + 0.7, 0);
  r1.rotation.z = Math.atan2(1.6, w / 2);
  const r2 = mesh(g, G('box', rl, 0.16, d + 0.8), ROOF(), w / 4, h + 0.7, 0);
  r2.rotation.z = -Math.atan2(1.6, w / 2);
  mesh(g, G('box', 0.4, 0.5, d + 0.7), ROOF(), 0, h + 1.42, 0);
  // door + windows
  mesh(g, G('box', 1.0, 1.6, 0.1), DARKWOOD(), 0, 0.8, d / 2 + 0.02);
  mesh(g, G('box', 0.8, 0.7, 0.08), PAPER(), -w / 3, 1.3, d / 2 + 0.02);
  mesh(g, G('box', 0.8, 0.7, 0.08), PAPER(), w / 3, 1.3, d / 2 + 0.02);
  return { group: g, half: Math.max(w, d) / 2 + 0.4 };
}

export function makeTorii(scale = 1) {
  const g = new THREE.Group();
  const pillarGeo = G('cyl', 0.22 * scale, 0.26 * scale, 4.4 * scale, 8);
  mesh(g, pillarGeo, VERMILION(), -1.5 * scale, 2.2 * scale, 0, 0.04);
  mesh(g, pillarGeo, VERMILION(), 1.5 * scale, 2.2 * scale, 0, -0.04);
  mesh(g, G('box', 4.6 * scale, 0.28 * scale, 0.4 * scale), VERMILION(), 0, 3.5 * scale, 0);
  const top = mesh(g, G('box', 5.4 * scale, 0.32 * scale, 0.55 * scale), VERMILION(), 0, 4.35 * scale, 0);
  top.rotation.z = 0.02;
  mesh(g, G('box', 0.26 * scale, 0.7 * scale, 0.3 * scale), VERMILION(), 0, 3.95 * scale, 0);
  return g;
}

export function makeBanner(color = 0x8a2a2a) {
  const g = new THREE.Group();
  mesh(g, G('cyl', 0.05, 0.06, 3.2, 6), DARKWOOD(), 0, 1.6, 0);
  const cloth = mesh(g, G('box', 0.7, 1.9, 0.04), M(color), 0, 2.1, 0);
  cloth.rotation.y = 0.3;
  return g;
}

export function makeShrineHall() {
  const g = new THREE.Group();
  mesh(g, G('box', 10, 0.6, 8), STONE(), 0, 0.3, 0);
  for (const [x, z] of [[-4, -3], [4, -3], [-4, 3], [4, 3], [0, -3], [0, 3]]) {
    mesh(g, G('cyl', 0.28, 0.32, 3.6, 8), VERMILION(), x, 2.2, z);
  }
  mesh(g, G('box', 8.4, 2.8, 6.4), DARKWOOD(), 0, 1.9, 0);
  const roof1 = mesh(g, G('box', 11.4, 0.3, 9), ROOF(), 0, 4.4, 0);
  roof1.rotation.x = 0.1;
  mesh(g, G('box', 8, 1.1, 4), ROOF(), 0, 5.6, 0);
  mesh(g, G('box', 1.6, 2.4, 0.2), DARKWOOD(), 0, 1.6, 3.21);
  return g;
}

export function makeCampfire() {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    mesh(g, G('dode', 0.22), STONE(), Math.cos(a) * 0.55, 0.12, Math.sin(a) * 0.55);
  }
  const log1 = mesh(g, G('cyl', 0.09, 0.09, 0.9, 5), DARKWOOD(), 0, 0.18, 0);
  log1.rotation.z = Math.PI / 2;
  const log2 = mesh(g, G('cyl', 0.09, 0.09, 0.9, 5), DARKWOOD(), 0, 0.18, 0);
  log2.rotation.set(Math.PI / 2, 0, Math.PI / 2.7);
  const flame = mesh(g, G('cone', 0.28, 0.7, 6), new THREE.MeshStandardMaterial({ color: 0xff8a30, emissive: 0xff6a10, emissiveIntensity: 2.2 }), 0, 0.55, 0);
  flame.name = 'flame';
  const light = new THREE.PointLight(0xff9a40, 2.2, 9, 1.8);
  light.position.y = 1.0;
  g.add(light);
  g.userData.flame = flame;
  return g;
}

export function makeStatue() {
  const g = new THREE.Group();
  mesh(g, G('box', 1.6, 0.5, 1.6), STONE(), 0, 0.25, 0);
  mesh(g, G('box', 1.0, 1.8, 0.9), M(0x6a6a62, { rough: 0.95 }), 0, 1.4, 0);
  mesh(g, G('sph', 0.32, 8, 6), M(0x6a6a62, { rough: 0.95 }), 0, 2.6, 0);
  const sword = mesh(g, G('box', 0.1, 1.7, 0.05), M(0x74747a, { metal: 0.5, rough: 0.5 }), 0.55, 1.7, 0);
  sword.rotation.z = -0.5;
  return g;
}

export function makeGrave(rng) {
  const g = new THREE.Group();
  mesh(g, G('cyl', 0.22, 0.28, 0.9 + rng() * 0.4, 7), STONE(), 0, 0.5, 0);
  mesh(g, G('cyl', 0.3, 0.34, 0.16, 7), STONE(), 0, 1.05, 0);
  return g;
}

export function makeChest() {
  const g = new THREE.Group();
  mesh(g, G('box', 0.9, 0.5, 0.6), DARKWOOD(), 0, 0.25, 0);
  const lid = mesh(g, G('box', 0.9, 0.22, 0.6), WOOD(), 0, 0.6, 0);
  mesh(g, G('box', 0.12, 0.14, 0.04), M(0xb8912e, { metal: 0.7, rough: 0.35 }), 0, 0.45, 0.31);
  g.userData.lid = lid;
  return g;
}

export function makeWallSegment(len = 8, h = 3.2) {
  const g = new THREE.Group();
  mesh(g, G('box', len, h, 1.4), M(0x74706a, { rough: 0.95 }), 0, h / 2, 0);
  mesh(g, G('box', len + 0.4, 0.3, 1.8), ROOF(), 0, h + 0.15, 0);
  return g;
}

export function makeKeepTower() {
  const g = new THREE.Group();
  mesh(g, G('box', 12, 5, 12), M(0x5e5a56, { rough: 0.95 }), 0, 2.5, 0);
  mesh(g, G('box', 10, 4, 10), M(0xd8d0bc), 0, 7, 0);
  mesh(g, G('box', 12.6, 0.4, 12.6), ROOF(), 0, 9.2, 0);
  mesh(g, G('box', 8, 3.4, 8), M(0xd8d0bc), 0, 11.4, 0);
  mesh(g, G('box', 10.4, 0.4, 10.4), ROOF(), 0, 13.3, 0);
  mesh(g, G('box', 5, 2.6, 5), M(0xd8d0bc), 0, 14.8, 0);
  mesh(g, G('box', 7, 0.35, 7), ROOF(), 0, 16.3, 0);
  mesh(g, G('cyl', 0.06, 0.08, 2.2, 5), DARKWOOD(), 0, 17.6, 0);
  const flag = mesh(g, G('box', 1.4, 0.8, 0.04), M(0x1a1a26), 0.7, 18.3, 0);
  flag.name = 'flag';
  return g;
}

export function makeCastleGate() {
  const g = new THREE.Group();
  mesh(g, G('box', 3.4, 7, 3), M(0x5e5a56), -4.5, 3.5, 0);
  mesh(g, G('box', 3.4, 7, 3), M(0x5e5a56), 4.5, 3.5, 0);
  mesh(g, G('box', 12.4, 2.2, 3.4), M(0x5e5a56), 0, 8.1, 0);
  mesh(g, G('box', 13, 0.5, 4), ROOF(), 0, 9.4, 0);
  mesh(g, G('box', 5.4, 5.6, 0.5), DARKWOOD(), 0, 2.8, 0);
  for (let i = 0; i < 4; i++) mesh(g, G('box', 0.16, 5.6, 0.56), M(0x8a8a90, { metal: 0.4 }), -1.9 + i * 1.27, 2.8, 0);
  return g;
}

// Resource nodes (gatherable). Variant visual per type.
export function makeNode(type, rng) {
  const g = new THREE.Group();
  switch (type) {
    case 'bamboo_node':
      for (let i = 0; i < 3; i++) {
        const s = mesh(g, G('cyl', 0.05, 0.06, 3 + rng(), 5), M(0x7a9a4e), (i - 1) * 0.3, 1.6, (rng() - 0.5) * 0.4);
        s.rotation.z = (rng() - 0.5) * 0.1;
      }
      break;
    case 'ore_node':
      mesh(g, G('dode', 0.8), STONE(), 0, 0.4, 0);
      for (let i = 0; i < 4; i++) {
        const c = mesh(g, G('dode', 0.16), M(0x9a6a4a, { metal: 0.5, rough: 0.5 }), (rng() - 0.5) * 1.1, 0.4 + rng() * 0.7, (rng() - 0.5) * 1.1);
        c.name = 'oreBit';
      }
      break;
    case 'herb_node':
      for (let i = 0; i < 5; i++) {
        mesh(g, G('cone', 0.12, 0.4, 5), M(0x4a8a3a), (rng() - 0.5) * 0.5, 0.2, (rng() - 0.5) * 0.5);
      }
      break;
    case 'ember_node':
      mesh(g, G('dode', 0.4), new THREE.MeshStandardMaterial({ color: 0xff5a20, emissive: 0xff3a00, emissiveIntensity: 1.6, roughness: 0.4 }), 0, 0.3, 0);
      break;
  }
  return g;
}

export function makeArrow(ang = 0) {
  const g = new THREE.Group();
  mesh(g, G('cyl', 0.012, 0.012, 0.7, 4), WOOD(), 0, 0, 0);
  mesh(g, G('cone', 0.03, 0.1, 5), M(0x8a8a92, { metal: 0.6 }), 0, 0.4, 0);
  g.rotation.x = Math.PI / 2; // point along -Z, then group orient by velocity
  return g;
}

export function makeFireball() {
  const m = new THREE.Mesh(G('sph', 0.22, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff6a20, emissive: 0xff4a00, emissiveIntensity: 2.4, roughness: 0.4 }));
  return m;
}
