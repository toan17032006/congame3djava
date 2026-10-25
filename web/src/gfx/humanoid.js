// Procedural humanoid rig (anime-stylized samurai). No external assets.
import * as THREE from 'three';
import { G, M, charMaterials, shadowify } from './materials.js';

const JOINTS = ['hips', 'torso', 'head', 'armR_sh', 'armR_el', 'armR_hand', 'armL_sh', 'armL_el', 'armL_hand',
  'legR_hip', 'legR_knee', 'legR_foot', 'legL_hip', 'legL_knee', 'legL_foot'];

export function buildHumanoid(opts = {}) {
  const colors = { cloth: 0x3a4a5a, skin: 0xc9a284, hair: 0x14100c, accent: 0x8a2a2a, plate: 0x4a4f58, ...opts.colors };
  const mats = charMaterials(colors, opts.ghost);
  const group = new THREE.Group();
  const body = new THREE.Group(); // animator rotates this (roll/spin); group carries yaw+position
  group.add(body);
  const joints = {};

  const joint = (name, parent, x, y, z) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    joints[name] = g;
    return g;
  };
  const mesh = (parent, geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  const hips = joint('hips', body, 0, 0.98, 0);
  mesh(hips, G('box', 0.32, 0.2, 0.22), mats.cloth, 0, -0.02, 0);
  const hakama = mesh(hips, G('cyl', 0.20, 0.33, 0.5, 10), mats.cloth, 0, -0.28, 0);
  hakama.castShadow = true;

  const torso = joint('torso', hips, 0, 0.1, 0);
  mesh(torso, G('box', 0.34, 0.32, 0.21), mats.cloth, 0, 0.17, 0);
  mesh(torso, G('box', 0.36, 0.1, 0.23), mats.accent, 0, 0.02, 0); // belt
  const chestPlate = mesh(torso, G('box', 0.38, 0.26, 0.24), mats.plate, 0, 0.2, 0.01); chestPlate.visible = false;
  const sash = mesh(torso, G('box', 0.4, 0.07, 0.25), mats.accent, 0, 0.05, 0.005); sash.visible = false;
  const pauldronL = mesh(torso, G('box', 0.14, 0.12, 0.2), mats.plate, -0.26, 0.3, 0); pauldronL.visible = false;
  const pauldronR = mesh(torso, G('box', 0.14, 0.12, 0.2), mats.plate, 0.26, 0.3, 0); pauldronR.visible = false;
  const fur = mesh(torso, G('box', 0.4, 0.1, 0.26), M(0x2a2622), 0, 0.33, -0.01); fur.visible = false;

  const head = joint('head', torso, 0, 0.42, 0);
  mesh(head, G('box', 0.22, 0.24, 0.22), mats.skin, 0, 0.11, 0);
  mesh(head, G('box', 0.24, 0.1, 0.24), mats.hair, 0, 0.23, -0.01);          // hair top
  mesh(head, G('box', 0.06, 0.14, 0.1), mats.hair, 0, 0.12, -0.12);          // back hair
  const eyeMat = M(0xf4f4f0, { rough: 0.4 });
  const pupilMat = M(0x201810, { rough: 0.4 });
  mesh(head, G('box', 0.05, 0.045, 0.01), eyeMat, -0.05, 0.12, 0.115);
  mesh(head, G('box', 0.05, 0.045, 0.01), eyeMat, 0.05, 0.12, 0.115);
  mesh(head, G('box', 0.025, 0.03, 0.012), pupilMat, -0.05, 0.12, 0.118);
  mesh(head, G('box', 0.025, 0.03, 0.012), pupilMat, 0.05, 0.12, 0.118);
  const brow = mesh(head, G('box', 0.12, 0.02, 0.01), mats.hair, 0, 0.17, 0.115);
  brow.rotation.z = 0.06;

  function buildArm(side) {
    const s = side === 'L' ? -1 : 1;
    const sh = joint(`arm${side}_sh`, torso, s * 0.24, 0.3, 0);
    mesh(sh, G('box', 0.09, 0.28, 0.09), mats.cloth, 0, -0.14, 0);
    const el = joint(`arm${side}_el`, sh, 0, -0.29, 0);
    mesh(el, G('box', 0.08, 0.26, 0.08), mats.cloth, 0, -0.13, 0);
    const hand = joint(`arm${side}_hand`, el, 0, -0.27, 0);
    mesh(hand, G('box', 0.075, 0.09, 0.075), mats.skin, 0, -0.04, 0);
    sh.rotation.set(0.08, 0, s * -0.14);
    el.rotation.x = -0.3;
  }
  buildArm('R'); buildArm('L');

  function buildLeg(side) {
    const s = side === 'L' ? -1 : 1;
    const hip = joint(`leg${side}_hip`, hips, s * 0.1, -0.5, 0);
    mesh(hip, G('box', 0.11, 0.3, 0.11), mats.skin, 0, -0.15, 0);
    const knee = joint(`leg${side}_knee`, hip, 0, -0.3, 0);
    mesh(knee, G('box', 0.095, 0.3, 0.095), mats.skin, 0, -0.15, 0);
    const foot = joint(`leg${side}_foot`, knee, 0, -0.32, 0);
    mesh(foot, G('box', 0.09, 0.06, 0.2), mats.plate, 0, -0.02, 0.05);
  }
  buildLeg('R'); buildLeg('L');

  // weapon anchor: child of right hand
  const weaponAnchor = new THREE.Group();
  weaponAnchor.position.set(0, -0.06, 0.02);
  joints.armR_hand.add(weaponAnchor);

  let weaponGroup = null, helmetGroup = null;
  const extra = { chestPlate, sash, pauldronL, pauldronR, fur, mats };

  shadowify(group);

  function setWeapon(model) {
    if (weaponGroup) { weaponAnchor.remove(weaponGroup); }
    weaponGroup = new THREE.Group();
    if (!model) { weaponAnchor.add(weaponGroup); return; }
    const metal = M(model.color, { rough: 0.35, metal: 0.7 });
    const dark = M(0x241c14, { rough: 0.9 });
    const len = model.len || 1.1;
    switch (model.style) {
      case 'katana': case 'nodachi': {
        const grip = mesh(weaponGroup, G('cyl', 0.02, 0.02, 0.22, 6), dark, 0, -0.1, 0);
        grip.rotation.x = Math.PI / 2;
        const guardKind = model.guard || 'round';
        const guard = guardKind === 'square'
          ? mesh(weaponGroup, G('box', 0.09, 0.02, 0.09), M(0x3a3a44, { metal: 0.6 }), 0, 0.02, 0)
          : mesh(weaponGroup, G('cyl', 0.05, 0.05, 0.015, 10), M(0x3a3a44, { metal: 0.6 }), 0, 0.02, 0);
        guard.rotation.x = Math.PI / 2;
        mesh(weaponGroup, G('box', 0.028, len, 0.012), metal, 0, 0.02 + len / 2, 0.0);
        mesh(weaponGroup, G('box', 0.02, 0.12, 0.014), metal, 0, 0.02 + len + 0.04, 0.006);
        break;
      }
      case 'club': {
        mesh(weaponGroup, G('cyl', 0.028, 0.028, 0.3, 6), dark, 0, -0.05, 0).rotation.x = Math.PI / 2;
        mesh(weaponGroup, G('cyl', 0.07, 0.05, len, 8), M(0x5a4632, { rough: 0.95 }), 0, 0.1 + len / 2, 0);
        mesh(weaponGroup, G('sph', 0.075, 8, 6), M(0x3a3230, { rough: 0.9 }), 0, 0.1 + len, 0);
        break;
      }
      case 'spear': {
        mesh(weaponGroup, G('cyl', 0.02, 0.02, len, 6), M(0x6a5238, { rough: 0.9 }), 0, len / 2 - 0.2, 0);
        mesh(weaponGroup, G('cone', 0.045, 0.22, 6), metal, 0, len - 0.1, 0);
        break;
      }
      case 'bow': {
        const arc = mesh(weaponGroup, G('torus', 0.4, 0.018, 6, 12, Math.PI), M(0x5a4632), 0, 0.15, 0);
        arc.rotation.y = Math.PI / 2;
        mesh(weaponGroup, G('cyl', 0.005, 0.005, 0.78, 4), M(0xd8d4c8), 0, 0.15, 0);
        break;
      }
      case 'claw': {
        for (let i = 0; i < 3; i++) mesh(weaponGroup, G('cone', 0.02, 0.22, 5), metal, (i - 1) * 0.05, 0.1, 0);
        break;
      }
      default: break;
    }
    shadowify(weaponGroup);
    weaponAnchor.add(weaponGroup);
  }

  function setArmor(armor) {
    chestPlate.visible = false; sash.visible = false; pauldronL.visible = false; pauldronR.visible = false; fur.visible = false;
    if (!armor || !armor.model) return;
    mats.cloth.color.setHex(armor.model.tint);
    for (const p of armor.model.parts || []) {
      if (p === 'sash') sash.visible = true;
      if (p === 'plates') chestPlate.visible = true;
      if (p === 'pauldrons') { pauldronL.visible = true; pauldronR.visible = true; }
      if (p === 'fur') fur.visible = true;
    }
  }

  function setHelmet(helmet) {
    if (helmetGroup) { head.remove(helmetGroup); helmetGroup = null; }
    if (!helmet || !helmet.model) return;
    helmetGroup = new THREE.Group();
    const metal = M(0x5a5f6a, { rough: 0.45, metal: 0.6 });
    switch (helmet.model.style) {
      case 'straw':
        mesh(helmetGroup, G('cone', 0.34, 0.14, 12), M(0xb8a878, { rough: 0.95 }), 0, 0.26, 0);
        break;
      case 'mask':
        mesh(helmetGroup, G('box', 0.2, 0.12, 0.04), metal, 0, 0.05, 0.13);
        mesh(helmetGroup, G('box', 0.23, 0.04, 0.05), metal, 0, 0.12, 0.12);
        break;
      case 'kabuto':
        mesh(helmetGroup, G('sph', 0.15, 10, 8), metal, 0, 0.2, 0);
        mesh(helmetGroup, G('box', 0.3, 0.03, 0.16), M(0xb8912e, { metal: 0.7, rough: 0.4 }), 0, 0.16, 0.1);
        mesh(helmetGroup, G('box', 0.02, 0.2, 0.12), M(0xb8912e, { metal: 0.7, rough: 0.4 }), 0, 0.36, -0.02);
        break;
    }
    shadowify(helmetGroup);
    head.add(helmetGroup);
  }

  setWeapon(opts.weapon || null);
  setArmor(opts.armor || null);
  if (opts.helmet) setHelmet(opts.helmet);
  if (opts.scale && opts.scale !== 1) group.scale.setScalar(opts.scale);

  return {
    group, body, joints, weaponAnchor, mats, extra,
    height: 1.72 * (opts.scale || 1),
    setWeapon, setArmor, setHelmet,
    setVisible(v) { group.visible = v; },
    dispose() {
      mats.dispose();
      group.traverse((o) => {}); // geometries shared via cache; materials owned disposed above
    },
  };
}
