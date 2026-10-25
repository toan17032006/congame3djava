// World: region construction (terrain, props, colliders, interactables) + queries.
import * as THREE from 'three';
import { makeNoise2D, mulberry32, clamp } from '../core/utils.js';
import { buildTerrain } from '../gfx/terrain.js';
import { makeTree, makeBambooField, makeRock, makeLantern, makeHouse, makeTorii, makeBanner,
  makeShrineHall, makeGrave, makeStatue, makeWallSegment, makeKeepTower, makeCastleGate, makeCampfire,
  makeMountain } from '../gfx/props.js';
import { buildGrass } from '../gfx/grass.js';
import { WIND, disposeSwayMaterials } from '../gfx/wind.js';
import { Interactable } from '../entities/interactable.js';

export class World {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    game.engine.scene.add(this.group);
    this.def = null;
    this.colliders = [];       // {x, z, r, h}
    this.interactables = [];
    this.owned = [];           // geometries/materials to dispose on unload
    this.heightFn = (x, z) => 0;
    this.baseY = 0;
    this.roadX = 0;
    this.spawnPoint = [0, 60];
    this.goalPos = [0, -60];
    this.regionGroup = null;
  }

  loadRegion(def) {
    this.clear();
    this.def = def;
    const rng = mulberry32(def.seed);
    const noise = makeNoise2D(def.seed);
    const size = def.size;
    this.roadX = 0;
    this.spawnPoint = [0, size / 2 - 14];
    this.goalPos = [0, -size / 2 + 10];

    // terrain height function per builder
    const b = def.builder;
    let amp = 2.2, freq = 0.02, wallAmp = 0;
    if (b === 'village' || b === 'shrine' || b === 'arena' || b === 'throne') { amp = 0.9; freq = 0.015; }
    if (b === 'meadow') { amp = 2.6; freq = 0.02; }
    if (b === 'bamboo') { amp = 1.6; freq = 0.025; }
    if (b === 'battlefield') { amp = 1.9; freq = 0.018; }
    if (b === 'mountain') { amp = 3.2; freq = 0.02; wallAmp = 7; }
    if (b === 'cave') { amp = 2.0; freq = 0.03; wallAmp = 10; }
    if (b === 'castle') { amp = 1.2; freq = 0.02; }
    this.baseY = 0;
    const half = size / 2;
    this.heightFn = (x, z) => {
      let h = noise.fbm(x * freq + 10, z * freq + 10, 4) * amp;
      if (wallAmp > 0) {
        // raise sides, keep a valley around the road
        const lat = Math.abs(x - this.roadX) / half;
        const dip = clamp((lat - 0.18) * 3.2, 0, 1);
        h += dip * dip * wallAmp;
      }
      // flatten near center/goal for combat & landmarks
      const cd = Math.hypot(x, z);
      if (cd < 16) h *= 0.4;
      const gd = Math.hypot(x - this.goalPos[0], z - this.goalPos[2]);
      if (gd < 14) h *= 0.35;
      return h;
    };

    const ter = buildTerrain(this, def, game.engine.quality);
    this.group.add(ter.mesh);
    this.owned.push(ter);
    this.regionGroup = new THREE.Group();
    this.group.add(this.regionGroup);

    this.buildProps(def, rng, noise);
    this.buildLandmarks(def, rng);
    this.buildBackdrop(def, rng);
    this.grass = buildGrass(this, def, rng, noise, game.engine.quality);
    if (this.grass) this.regionGroup.add(this.grass.mesh);
    return true;
  }

  addProp(obj, x, z, r = 0, h = 3) {
    const y = this.heightFn(x, z);
    obj.position.set(x, y, z);
    this.regionGroup.add(obj);
    if (r > 0) this.colliders.push({ x, z, r, h });
    return obj;
  }

  buildProps(def, rng, noise) {
    const d = def.decor;
    const size = def.size, half = size / 2;
    const scatter = (count, fn, minRoad = 3.5) => {
      let placed = 0, tries = 0;
      while (placed < count && tries < count * 12) {
        tries++;
        const x = (rng() - 0.5) * size * 0.92;
        const z = (rng() - 0.5) * size * 0.92;
        if (Math.abs(x - this.roadX) < minRoad && Math.abs(z) < half * 0.7) continue; // keep road clear
        if (Math.hypot(x - this.spawnPoint[0], z - this.spawnPoint[1]) < 8) continue;
        fn(x, z);
        placed++;
      }
    };

    if (d.trees > 0) scatter(d.trees, (x, z) => {
      const t = makeTree(rng, rng() < 0.7 ? 'pine' : 'maple');
      const s = 0.8 + rng() * 0.7;
      t.scale.setScalar(s);
      this.addProp(t, x, z, 0.55 * s, 4);
    });
    if (d.rocks > 0) scatter(d.rocks, (x, z) => {
      const s = 0.6 + rng() * 1.6;
      this.addProp(makeRock(rng, s), x, z, s * 0.8, s * 1.2);
    });
    if (d.bamboo > 0) {
      const count = d.bamboo;
      const field = makeBambooField(count, rng);
      // spread instances over region avoiding road
      const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1);
      const stems = field.children[0], leaves = field.children[1];
      let placed = 0, tries = 0;
      while (placed < count && tries < count * 8) {
        tries++;
        const x = (rng() - 0.5) * size * 0.94, z = (rng() - 0.5) * size * 0.94;
        if (Math.abs(x - this.roadX) < 4.5 && Math.abs(z) < half * 0.75) continue;
        e.set(0, rng() * Math.PI * 2, 0);
        q.setFromEuler(e);
        p.set(x, this.heightFn(x, z), z);
        m4.compose(p, q, s);
        stems.setMatrixAt(placed, m4);
        leaves.setMatrixAt(placed, m4);
        placed++;
        if (placed % 6 === 0) this.colliders.push({ x, z, r: 0.18, h: 3 });
      }
      stems.count = placed; leaves.count = placed;
      stems.instanceMatrix.needsUpdate = true; leaves.instanceMatrix.needsUpdate = true;
      this.regionGroup.add(field);
    }
    if (d.houses > 0) {
      // rows flanking the road
      const rows = Math.ceil(d.houses / 2);
      for (let i = 0; i < rows; i++) {
        for (const side of [-1, 1]) {
          if (i * 2 + (side > 0 ? 1 : 0) >= d.houses) continue;
          const x = side * (13 + rng() * 4);
          const z = -half * 0.45 + i * (size / (rows * 1.9)) + (rng() - 0.5) * 6;
          const h = makeHouse(rng, [0xd8d0bc, 0xcfc4a8, 0xd4cabc][(rng() * 3) | 0]);
          h.group.rotation.y = side > 0 ? -Math.PI / 2 + (rng() - 0.5) * 0.3 : Math.PI / 2 + (rng() - 0.5) * 0.3;
          this.addProp(h.group, x, z, h.half * 0.8, 4.5);
        }
      }
    }
    if (d.lanterns > 0) {
      // lantern rows along the road + scattered
      const roadLanterns = Math.min(d.lanterns, Math.ceil(d.lanterns * 0.7));
      for (let i = 0; i < roadLanterns; i++) {
        const z = half * 0.6 - (i / roadLanterns) * size * 1.1;
        const side = i % 2 === 0 ? -1 : 1;
        this.addProp(makeLantern(def.light.night), side * 4.6, z + (rng() - 0.5) * 3, 0.45, 2);
      }
      for (let i = roadLanterns; i < d.lanterns; i++) {
        const x = (rng() - 0.5) * size * 0.8, z = (rng() - 0.5) * size * 0.8;
        this.addProp(makeLantern(def.light.night), x, z, 0.45, 2);
      }
    }
    if (d.torii > 0) {
      for (let i = 0; i < d.torii; i++) {
        const z = half * 0.3 - i * 22;
        this.addProp(makeTorii(1.1), this.roadX, z, 0.5, 4.5);
      }
    }
    if (d.banners > 0) {
      for (let i = 0; i < d.banners; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const z = half * 0.5 - (i / d.banners) * size;
        const bn = makeBanner([0x8a2a2a, 0x2a3a6a, 0x2a2a2a, 0x6a1a1a][(rng() * 4) | 0]);
        this.addProp(bn, side * (5.5 + rng() * 1.5), z, 0.15, 2.5);
      }
    }
  }

  buildLandmarks(def, rng) {
    const b = def.builder;
    const half = def.size / 2;
    const [gx, gz] = this.goalPos;
    switch (b) {
      case 'meadow':
        // bandit camp mid-map
        this.addProp(makeCampfire(), 0, 8, 0.6, 1);
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          const tent = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.8, 5), new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.9 }));
          tent.castShadow = true;
          tent.position.set(Math.cos(a) * 3.4, this.heightFn(Math.cos(a) * 3.4, 8 + Math.sin(a) * 3.4) + 0.9, 8 + Math.sin(a) * 3.4);
          this.regionGroup.add(tent);
          this.colliders.push({ x: tent.position.x, z: tent.position.z, r: 1.4, h: 2 });
        }
        this.addProp(makeTorii(1.2), gx, gz, 0.6, 5);
        break;
      case 'village': {
        // village shrine at goal + well at center
        const shrine = makeShrineHall();
        shrine.position.set(gx, this.heightFn(gx, gz), gz);
        this.regionGroup.add(shrine);
        this.colliders.push({ x: gx, z: gz, r: 4.6, h: 5 });
        const well = makeRock(rng, 1.2);
        this.addProp(well, 0, 0, 1.0, 1.5);
        break;
      }
      case 'bamboo': {
        // clearing with statue at goal
        this.addProp(makeStatue(), gx, gz, 1.0, 3);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + 0.4;
          this.addProp(makeLantern(true), gx + Math.cos(a) * 5, gz + Math.sin(a) * 5, 0.45, 2);
        }
        break;
      }
      case 'mountain':
        this.addProp(makeTorii(1.3), gx, gz, 0.6, 5.5);
        this.addProp(makeCampfire(), 0, 20, 0.6, 1);
        break;
      case 'shrine': {
        const hall = makeShrineHall();
        hall.position.set(gx, this.heightFn(gx, gz), gz);
        this.regionGroup.add(hall);
        this.colliders.push({ x: gx, z: gz, r: 5.4, h: 5.5 });
        this.addProp(makeStatue(), 0, -20, 1.0, 3);
        break;
      }
      case 'battlefield': {
        // center banner (defend objective)
        const pole = new THREE.Group();
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5, 6), new THREE.MeshStandardMaterial({ color: 0x3e2c1c }));
        p.position.y = 2.5; p.castShadow = true;
        const flag = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.05), new THREE.MeshStandardMaterial({ color: 0x2a4a8a }));
        flag.position.set(0.95, 4.2, 0); flag.castShadow = true;
        pole.add(p, flag);
        this.addProp(pole, 0, -6, 0.3, 5);
        for (let i = 0; i < 10; i++) this.addProp(makeGrave(rng), (rng() - 0.5) * 60, -half * 0.5 + rng() * 70, 0.3, 1.2);
        break;
      }
      case 'cave': {
        // mine arch at goal
        const arch = new THREE.Group();
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x5c5650, roughness: 0.95 });
        for (let i = 0; i < 5; i++) {
          const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6 + rng()), rockMat);
          r.position.set(-2.6 + i * 1.3, this.heightFn(gx - 2.6 + i * 1.3, gz) + (i === 0 || i === 4 ? 1.4 : 3.4), gz);
          r.castShadow = true;
          arch.add(r);
        }
        this.regionGroup.add(arch);
        for (let i = 0; i < 5; i++) {
          const ox = gx + (rng() - 0.5) * 24, oz = gz + (rng() - 0.5) * 24;
          this.addProp(makeRock(rng, 1 + rng() * 2), ox, oz, 1.2, 2);
        }
        break;
      }
      case 'arena': {
        // stone ring of low walls
        const R = 22;
        for (let i = 0; i < 26; i++) {
          const a = (i / 26) * Math.PI * 2;
          const x = Math.cos(a) * R, z = Math.sin(a) * R;
          const w = makeWallSegment(4, 1.6);
          w.position.set(x, this.heightFn(x, z), z);
          w.rotation.y = -a + Math.PI / 2;
          this.regionGroup.add(w);
          this.colliders.push({ x, z, r: 2.0, h: 2 });
        }
        this.addProp(makeStatue(), -14, 0, 1.0, 3);
        this.addProp(makeStatue(), 14, 0, 1.0, 3);
        break;
      }
      case 'castle': {
        // keep tower at goal + wall rows
        const keep = makeKeepTower();
        keep.position.set(gx, this.heightFn(gx, gz) - 0.5, gz);
        this.regionGroup.add(keep);
        this.colliders.push({ x: gx, z: gz, r: 7.2, h: 17 });
        for (const side of [-1, 1]) {
          for (let i = 0; i < 5; i++) {
            const x = side * (16 + rng() * 3), z = -half * 0.3 + i * (half * 0.28);
            const w = makeWallSegment(9, 3.4);
            w.position.set(x, this.heightFn(x, z), z);
            w.rotation.y = side * Math.PI / 2 + (rng() - 0.5) * 0.2;
            this.regionGroup.add(w);
            this.colliders.push({ x, z, r: 4.4, h: 4 });
          }
        }
        break;
      }
      case 'throne': {
        // pillars rows + throne
        for (const x of [-9, -4.5, 4.5, 9]) {
          for (const z of [-24, -10, 4, 18]) {
            const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 9, 10), new THREE.MeshStandardMaterial({ color: 0x4a4450, roughness: 0.9 }));
            pil.position.set(x, this.heightFn(x, z) + 4.5, z);
            pil.castShadow = true;
            this.regionGroup.add(pil);
            this.colliders.push({ x, z, r: 1.0, h: 9 });
          }
        }
        const throne = new THREE.Group();
        const seat = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 2.4), new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.6 }));
        seat.position.y = 0.6;
        const back = new THREE.Mesh(new THREE.BoxGeometry(3, 4.4, 0.5), new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.6 }));
        back.position.set(0, 2.6, -1.0);
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), new THREE.MeshStandardMaterial({ color: 0x9a6aff, emissive: 0x6a3aff, emissiveIntensity: 2, roughness: 0.3 }));
        gem.position.set(0, 3.6, -0.6);
        throne.add(seat, back, gem);
        throne.position.set(gx, this.heightFn(gx, gz), gz);
        this.regionGroup.add(throne);
        this.colliders.push({ x: gx, z: gz, r: 2.0, h: 4 });
        this.throneGem = gem;
        break;
      }
    }
  }

  // distant mountain ring so the horizon never shows a flat edge
  buildBackdrop(def, rng) {
    if (def.builder === 'cave' || def.builder === 'throne') return;
    const size = def.size;
    const count = def.builder === 'mountain' ? 5 : 11;
    const fog = new THREE.Color(def.sky.bottom);
    const tint = new THREE.Color(def.palette.rock).lerp(fog, 0.45);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rng() * 0.4;
      const r = size * (0.68 + rng() * 0.16);
      const m = makeMountain(rng, tint.getHex());
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      m.position.set(x, this.heightFn(x, z) - 6, z);
      this.regionGroup.add(m);
    }
  }

  // ---- queries ------------------------------------------------------------
  groundAt(x, z) {
    if (!this.def) return 0;
    return this.heightFn(x, z);
  }

  collideCircle(pos, r) {
    for (const c of this.colliders) {
      const dx = pos.x - c.x, dz = pos.z - c.z;
      const min = c.r + r;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = (min - d) / d;
        pos.x += dx * push;
        pos.z += dz * push;
      }
    }
  }

  segmentBlocked(x1, y1, z1, x2, y2, z2) {
    for (const c of this.colliders) {
      if (c.h < 2.2) continue;
      const dx = x2 - x1, dz = z2 - z1;
      const len2 = dx * dx + dz * dz;
      let t = len2 > 0 ? ((c.x - x1) * dx + (c.z - z1) * dz) / len2 : 0;
      t = clamp(t, 0, 1);
      const px = x1 + dx * t, pz = z1 + dz * t;
      const py = y1 + (y2 - y1) * t;
      if (py < c.h + 0.3) {
        const d = Math.hypot(px - c.x, pz - c.z);
        if (d < c.r + 0.35) return true;
      }
    }
    return false;
  }

  separate(npc, dt) {
    // cheap separation from nearby NPCs
    const npcs = this.game.npcs;
    for (const o of npcs) {
      if (o === npc || o.disposed || o.combat.dead) continue;
      const dx = npc.pos.x - o.pos.x, dz = npc.pos.z - o.pos.z;
      const d2 = dx * dx + dz * dz;
      const min = npc.radius + o.radius + 0.15;
      if (d2 < min * min && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = (min - d) / d * 0.5;
        npc.pos.x += dx * push;
        npc.pos.z += dz * push;
      }
    }
  }

  // ---- interactables ------------------------------------------------------
  addInteractable(cfg) {
    const it = new Interactable(this.game, cfg);
    this.interactables.push(it);
    return it;
  }

  nearestInteractable(pos, range) {
    let best = null, bestD = range;
    for (const it of this.interactables) {
      if (it.used && it.type !== 'shrine') continue;
      const d = Math.hypot(it.x - pos.x, it.z - pos.z);
      if (d < bestD) { best = it; bestD = d; }
    }
    return best;
  }

  useInteractable(it, player) { it.use(player); }

  spawnResourceNodes(counts) {
    const rng = mulberry32(this.def.seed + 7);
    const size = this.def.size, half = size / 2;
    for (const [type, count] of Object.entries(counts || {})) {
      for (let i = 0; i < count; i++) {
        let x, z, tries = 0;
        do {
          x = (rng() - 0.5) * size * 0.85;
          z = (rng() - 0.5) * size * 0.85;
          tries++;
        } while ((Math.abs(x) < 3.5 && Math.abs(z) < half * 0.7 || Math.hypot(x, z) < 12) && tries < 20);
        this.addInteractable({ type: 'resource', x, z, item: type, qty: 1, respawn: 90 });
      }
    }
  }

  update(dt) {
    WIND.uTime.value = this.game.time;
    for (const it of this.interactables) it.update(dt);
  }

  clear() {
    if (this.regionGroup) {
      this.group.remove(this.regionGroup);
      this.regionGroup.traverse(() => {});
      this.regionGroup = null;
    }
    for (const o of this.owned) {
      if (o.mesh) this.group.remove(o.mesh);
      if (o.geo) o.geo.dispose();
      if (o.mat) o.mat.dispose();
    }
    this.owned = [];
    if (this.grass) {
      this.grass.geo.dispose();
      this.grass.mesh.parent?.remove(this.grass.mesh);
      this.grass = null;
    }
    disposeSwayMaterials();
    for (const it of this.interactables) it.dispose(this.game);
    this.interactables = [];
    this.colliders = [];
    this.def = null;
  }
}
