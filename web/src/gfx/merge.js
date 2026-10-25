// Draw-call reduction: merges static meshes of a built region into per-material,
// per-grid-cell batches. Wind-swayed meshes (userData.windUniforms materials) and
// anything flagged userData.noMerge keep their own draw calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();

function bakeGeometry(mesh) {
  const src = mesh.geometry;
  const g = src.index ? src.toNonIndexed() : src.clone();
  // keep only attributes every primitive shares, so buckets always align
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
  }
  g.applyMatrix4(mesh.matrixWorld);
  return g;
}

export function mergeStaticProps(regionGroup, cellSize = 26) {
  regionGroup.updateMatrixWorld(true);
  const buckets = new Map(); // `${cx}|${cz}|${matId}|${flags}` -> {mat, castShadow, receiveShadow, geos}
  const originals = [];
  regionGroup.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.noMerge) return;
    const mat = o.material;
    if (!mat || (mat.userData && mat.userData.windUniforms)) return; // sway mesh: keep separate
    const geo = o.geometry;
    if (!geo || !geo.attributes.position || !geo.attributes.normal) return;
    // visible world position determines the chunk (groups may be nested)
    const wp = o.getWorldPosition(new THREE.Vector3());
    const cx = Math.floor(wp.x / cellSize), cz = Math.floor(wp.z / cellSize);
    const key = `${cx}|${cz}|${mat.uuid}|${o.castShadow ? 1 : 0}${o.receiveShadow ? 1 : 0}`;
    let b = buckets.get(key);
    if (!b) {
      b = { mat, castShadow: o.castShadow, receiveShadow: o.receiveShadow, geos: [] };
      buckets.set(key, b);
    }
    b.geos.push(bakeGeometry(o));
    originals.push(o);
  });
  if (!originals.length) return [];
  const merged = [];
  for (const b of buckets.values()) {
    const geo = b.geos.length === 1 ? b.geos[0] : mergeGeometries(b.geos, false);
    for (const g of b.geos) if (g !== geo) g.dispose();
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, b.mat);
    mesh.castShadow = b.castShadow;
    mesh.receiveShadow = b.receiveShadow;
    mesh.matrixAutoUpdate = false;
    regionGroup.add(mesh);
    merged.push(mesh);
  }
  for (const o of originals) o.parent.remove(o);
  return merged;
}
