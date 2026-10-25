// Shared geometry/material caches + per-humanoid material factory.
import * as THREE from 'three';

const geoCache = new Map();
export function G(kind, ...args) {
  const key = kind + args.join(',');
  if (!geoCache.has(key)) {
    let g;
    switch (kind) {
      case 'box': g = new THREE.BoxGeometry(...args); break;
      case 'cyl': g = new THREE.CylinderGeometry(args[0], args[1], args[2], args[3] || 8); break;
      case 'sph': g = new THREE.SphereGeometry(args[0], args[1] || 10, args[2] || 8); break;
      case 'cone': g = new THREE.ConeGeometry(args[0], args[1], args[2] || 8); break;
      case 'torus': g = new THREE.TorusGeometry(...args); break;
      case 'plane': g = new THREE.PlaneGeometry(...args); break;
      case 'circle': g = new THREE.CircleGeometry(...args); break;
      case 'ring': g = new THREE.RingGeometry(...args); break;
      case 'dode': g = new THREE.DodecahedronGeometry(...args); break;
      case 'ico': g = new THREE.IcosahedronGeometry(...args); break;
      default: throw new Error('unknown geo ' + kind);
    }
    geoCache.set(key, g);
  }
  return geoCache.get(key);
}

const matCache = new Map();
export function M(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.85, metalness: opts.metal ?? 0.05, ...opts.extra }));
  }
  return matCache.get(key);
}

// Per-character materials (owned, tintable, disposed with the rig)
export function charMaterials(colors, ghost) {
  const mk = (color, opts = {}) => new THREE.MeshStandardMaterial({
    color, roughness: opts.rough ?? 0.8, metalness: opts.metal ?? 0.05,
    transparent: !!ghost, opacity: ghost ? 0.55 : 1, emissive: ghost ? new THREE.Color(color).multiplyScalar(0.25) : 0x000000,
  });
  return {
    cloth: mk(colors.cloth),
    accent: mk(colors.accent ?? 0x8a2a2a, { rough: 0.7 }),
    skin: mk(colors.skin, { rough: 0.65 }),
    hair: mk(colors.hair, { rough: 0.9 }),
    plate: mk(colors.plate ?? 0x4a4f58, { rough: 0.5, metal: 0.55 }),
    dispose() { for (const k of ['cloth', 'accent', 'skin', 'hair', 'plate']) this[k].dispose(); },
  };
}

export function shadowify(root) {
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
}
