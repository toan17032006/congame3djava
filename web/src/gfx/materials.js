// Shared geometry/material caches (framework ResourceCache) + per-humanoid material factory.
import * as THREE from 'three';
import { ResourceCache } from '../framework/patterns/cache.js';

const geoCache = new ResourceCache({ onDispose: (g) => g.dispose() });
export function G(kind, ...args) {
  return geoCache.get(kind + args.join(','), () => buildGeo(kind, args));
}

function buildGeo(kind, args) {
  switch (kind) {
    case 'box': return new THREE.BoxGeometry(...args);
    case 'cyl': return new THREE.CylinderGeometry(args[0], args[1], args[2], args[3] || 8);
    case 'sph': return new THREE.SphereGeometry(args[0], args[1] || 10, args[2] || 8);
    case 'cone': return new THREE.ConeGeometry(args[0], args[1], args[2] || 8);
    case 'torus': return new THREE.TorusGeometry(...args);
    case 'plane': return new THREE.PlaneGeometry(...args);
    case 'circle': return new THREE.CircleGeometry(...args);
    case 'ring': return new THREE.RingGeometry(...args);
    case 'dode': return new THREE.DodecahedronGeometry(...args);
    case 'ico': return new THREE.IcosahedronGeometry(...args);
    default: throw new Error('unknown geo ' + kind);
  }
}

const matCache = new ResourceCache({ onDispose: (m) => m.dispose() });
export function M(color, opts = {}) {
  return matCache.get(color + JSON.stringify(opts), () =>
    new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.85, metalness: opts.metal ?? 0.05, ...opts.extra }));
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
