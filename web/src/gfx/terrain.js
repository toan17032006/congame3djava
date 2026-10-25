// Terrain heightfield driven by world.heightFn; palette-colored via vertex colors.
import * as THREE from 'three';
import { M } from './materials.js';

export function buildTerrain(world, def) {
  const size = def.size;
  const seg = 96;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const pal = new THREE.Color(def.palette.grass);
  const dirt = new THREE.Color(def.palette.dirt);
  const rock = new THREE.Color(def.palette.rock);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = world.heightFn(x, z);
    pos.setY(i, y);
    const hN = (y - world.baseY) / 14;
    c.copy(pal);
    if (hN > 0.35) c.lerp(rock, Math.min((hN - 0.35) / 0.5, 1));
    if (hN < 0.08) c.lerp(dirt, 0.5);
    // path tint down the middle (north-south road)
    const road = Math.max(0, 1 - Math.abs(x - world.roadX) / 5.5) * (1 - Math.abs(z) / (size / 2));
    if (road > 0.01) c.lerp(new THREE.Color(def.palette.path), road * 0.85);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return { mesh, geo, mat };
}

export function buildWater(def, world) {
  const geo = new THREE.PlaneGeometry(def.size, def.size, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0x2e5a6e, transparent: true, opacity: 0.75, roughness: 0.15, metalness: 0.4 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = world.baseY - 1.2;
  return { mesh, geo, mat };
}
