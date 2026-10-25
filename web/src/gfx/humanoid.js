// Procedural humanoid rig v2 — detailed samurai: layered clothing, lacquered armor,
// PBR cloth (sheen) / skin / metal, expressive head, katana with hamon & saya, blob shadow.
import * as THREE from 'three';
import { G, M } from './materials.js';

let _blobTex = null;
function blobTexture() {
  if (_blobTex) return _blobTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const ctx = cv.getContext('2d');
  const gr = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)');
  gr.addColorStop(0.7, 'rgba(0,0,0,0.25)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 64, 64);
  _blobTex = new THREE.CanvasTexture(cv);
  return _blobTex;
}

export function charMaterials(colors, ghost) {
  const mk = (color, opts = {}) => new THREE.MeshPhysicalMaterial({
    color,
    roughness: opts.rough ?? 0.85, metalness: opts.metal ?? 0.02,
    sheen: opts.sheen ?? 0, sheenColor: new THREE.Color(0xffffff).multiplyScalar(0.5), sheenRoughness: 0.6,
    envMapIntensity: opts.envInt ?? 0.5,
    transparent: !!ghost, opacity: ghost ? 0.55 : 1,
    emissive: ghost ? new THREE.Color(color).multiplyScalar(0.3) : 0x000000,
  });
  return {
    cloth: mk(colors.cloth, { rough: 0.92, sheen: 0.5, envInt: 0.35 }),
    accent: mk(colors.accent ?? 0x8a2a2a, { rough: 0.75, sheen: 0.35, envInt: 0.5 }),
    skin: mk(colors.skin, { rough: 0.52, envInt: 0.55 }),
    hair: mk(colors.hair, { rough: 0.45, sheen: 0.65, envInt: 0.8 }),
    plate: mk(colors.plate ?? 0x4a4f58, { rough: 0.32, metal: 0.85, envInt: 1.3 }),
    lacquer: mk(0x1a1416, { rough: 0.22, metal: 0.25, envInt: 1.1 }),
    dispose() { for (const k of ['cloth', 'accent', 'skin', 'hair', 'plate', 'lacquer']) this[k].dispose(); },
  };
}

export function buildHumanoid(opts = {}) {
  const colors = { cloth: 0x3a4a5a, skin: 0xc9a284, hair: 0x14100c, accent: 0x8a2a2a, plate: 0x4a4f58, ...opts.colors };
  const mats = charMaterials(colors, opts.ghost);
  const group = new THREE.Group();
  const body = new THREE.Group(); // animator roll/spin wrapper
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
  const skinM = mats.skin, clothM = mats.cloth;

  // ================= lower body =================
  const hips = joint('hips', body, 0, 0.98, 0);
  mesh(hips, G('box', 0.3, 0.18, 0.22), clothM, 0, -0.02, 0);
  const hakama = mesh(hips, G('cyl', 0.21, 0.34, 0.52, 10), clothM, 0, -0.3, 0);
  // hakama pleats
  for (let i = 0; i < 4; i++) {
    const a = -0.6 + i * 0.4;
    const pl = mesh(hips, G('box', 0.03, 0.5, 0.015), mats.lacquer, Math.sin(a) * 0.3, -0.3, Math.cos(a) * 0.3);
    pl.rotation.y = a;
  }

  // ================= torso =================
  const torso = joint('torso', hips, 0, 0.1, 0);
  mesh(torso, G('box', 0.33, 0.3, 0.2), clothM, 0, 0.16, 0);          // under-kimono
  mesh(torso, G('box', 0.37, 0.1, 0.23), mats.accent, 0, 0.0, 0);     // obi belt
  const knot = mesh(torso, G('box', 0.14, 0.09, 0.07), mats.accent, 0, 0.0, -0.14); // obi knot (back)
  // kimono collar V
  const colL = mesh(torso, G('box', 0.05, 0.34, 0.03), M(0xe8e2d4, { rough: 0.85 }), -0.1, 0.18, 0.105);
  colL.rotation.z = 0.28; colL.rotation.x = 0.05;
  const colR = mesh(torso, G('box', 0.05, 0.34, 0.03), M(0xe8e2d4, { rough: 0.85 }), 0.1, 0.18, 0.105);
  colR.rotation.z = -0.28; colR.rotation.x = 0.05;
  // chest do-maru plate (toggled by armor)
  const chestPlate = mesh(torso, G('box', 0.38, 0.3, 0.25), mats.plate, 0, 0.18, 0.005);
  const lacingA = mesh(torso, G('box', 0.4, 0.016, 0.26), mats.lacquer, 0, 0.1, 0.004);
  const lacingB = mesh(torso, G('box', 0.4, 0.016, 0.26), mats.lacquer, 0, 0.18, 0.004);
  const lacingC = mesh(torso, G('box', 0.4, 0.016, 0.26), mats.lacquer, 0, 0.26, 0.004);
  const sash = mesh(torso, G('box', 0.41, 0.07, 0.26), mats.accent, 0, 0.045, 0.005);
  const pauldronL = mesh(torso, G('box', 0.15, 0.1, 0.22), mats.plate, -0.27, 0.31, 0);
  const pauldronL2 = mesh(torso, G('box', 0.13, 0.06, 0.2), mats.plate, -0.28, 0.23, 0.01);
  const pauldronR = mesh(torso, G('box', 0.15, 0.1, 0.22), mats.plate, 0.27, 0.31, 0);
  const pauldronR2 = mesh(torso, G('box', 0.13, 0.06, 0.2), mats.plate, 0.28, 0.23, 0.01);
  const fur = mesh(torso, G('box', 0.4, 0.1, 0.26), M(0x2a2622, { rough: 1 }), 0, 0.35, -0.01);
  const thighL = mesh(torso, G('box', 0.13, 0.34, 0.16), mats.plate, -0.15, -0.05, 0.12);
  const thighR = mesh(torso, G('box', 0.13, 0.34, 0.16), mats.plate, 0.15, -0.05, 0.12);
  for (const p of [chestPlate, lacingA, lacingB, lacingC, pauldronL, pauldronL2, pauldronR, pauldronR2, thighL, thighR]) p.visible = false;

  // ================= head =================
  const neck = mesh(torso, G('cyl', 0.06, 0.07, 0.09, 6), skinM, 0, 0.37, 0);
  const head = joint('head', torso, 0, 0.42, 0);
  const skull = mesh(head, G('sph', 0.115, 12, 10), skinM, 0, 0.12, 0);
  skull.scale.set(0.94, 1.06, 0.98);
  const jaw = mesh(head, G('box', 0.13, 0.08, 0.11), skinM, 0, 0.045, 0.018);
  const nose = mesh(head, G('box', 0.024, 0.05, 0.035), skinM, 0, 0.1, 0.1);
  const earL = mesh(head, G('box', 0.02, 0.045, 0.03), skinM, -0.105, 0.1, -0.005);
  const earR = mesh(head, G('box', 0.02, 0.045, 0.03), skinM, 0.105, 0.1, -0.005);
  // eyes: sclera + iris + highlight
  const eyeMat = M(0xf4f4f0, { rough: 0.25, extra: { envMapIntensity: 1 } });
  const pupilMat = M(0x201810, { rough: 0.2 });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const s of [-1, 1]) {
    const sc = mesh(head, G('sph', 0.026, 8, 6), eyeMat, s * 0.048, 0.115, 0.088);
    sc.scale.set(1, 0.85, 0.5);
    const ir = mesh(head, G('sph', 0.014, 8, 6), pupilMat, s * 0.048, 0.113, 0.098);
    ir.scale.set(1, 1, 0.4);
    const gl = mesh(head, G('sph', 0.004, 4, 3), glintMat, s * 0.048 + 0.006, 0.119, 0.102);
  }
  // brows
  const browL = mesh(head, G('box', 0.05, 0.014, 0.01), mats.hair, -0.05, 0.155, 0.096);
  browL.rotation.z = 0.12;
  const browR = mesh(head, G('box', 0.05, 0.014, 0.01), mats.hair, 0.05, 0.155, 0.096);
  browR.rotation.z = -0.12;
  // hair: cap + back volume + sideburns
  const hairCap = mesh(head, G('sph', 0.122, 12, 9), mats.hair, 0, 0.135, -0.008);
  hairCap.scale.set(0.97, 0.95, 1.0);
  const hairBack = mesh(head, G('box', 0.16, 0.16, 0.06), mats.hair, 0, 0.1, -0.088);
  const hairTop = mesh(head, G('sph', 0.06, 8, 6), mats.hair, 0, 0.235, -0.01);
  const sideL = mesh(head, G('box', 0.025, 0.1, 0.05), mats.hair, -0.1, 0.075, 0.02);
  const sideR = mesh(head, G('box', 0.025, 0.1, 0.05), mats.hair, 0.1, 0.075, 0.02);
  // samurai topknot (chonmage) unless opts.topknot === false
  const topknotTie = mesh(head, G('cyl', 0.02, 0.02, 0.1, 6), mats.accent, 0, 0.25, -0.045);
  topknotTie.rotation.x = 0.5;
  const topknot = mesh(head, G('sph', 0.045, 8, 6), mats.hair, 0, 0.28, -0.075);
  topknot.scale.set(1, 0.7, 1.5);
  if (opts.topknot === false) { topknot.visible = false; topknotTie.visible = false; }

  // ================= arms =================
  function buildArm(side) {
    const s = side === 'L' ? -1 : 1;
    const sh = joint(`arm${side}_sh`, torso, s * 0.235, 0.3, 0);
    mesh(sh, G('box', 0.095, 0.12, 0.11), clothM, 0, -0.05, 0);        // shoulder pad of cloth
    const upper = mesh(sh, G('box', 0.085, 0.24, 0.085), clothM, 0, -0.17, 0);
    const el = joint(`arm${side}_el`, sh, 0, -0.29, 0);
    const sleeve = mesh(el, G('box', 0.105, 0.15, 0.105), clothM, 0, -0.06, 0); // wide sleeve cuff
    const fore = mesh(el, G('box', 0.072, 0.2, 0.072), skinM, 0, -0.16, 0);
    const hand = joint(`arm${side}_hand`, el, 0, -0.27, 0);
    mesh(hand, G('box', 0.075, 0.1, 0.075), skinM, 0, -0.045, 0);
    sh.rotation.set(0.08, 0, s * -0.14);
    el.rotation.x = -0.3;
  }
  buildArm('R'); buildArm('L');

  // ================= legs =================
  function buildLeg(side) {
    const s = side === 'L' ? -1 : 1;
    const hip = joint(`leg${side}_hip`, hips, s * 0.1, -0.5, 0);
    mesh(hip, G('box', 0.115, 0.3, 0.115), skinM, 0, -0.15, 0);
    const knee = joint(`leg${side}_knee`, hip, 0, -0.3, 0);
    mesh(knee, G('box', 0.095, 0.3, 0.095), skinM, 0, -0.15, 0);
    // kyahan gaiter
    mesh(knee, G('box', 0.105, 0.2, 0.105), clothM, 0, -0.2, 0);
    const foot = joint(`leg${side}_foot`, knee, 0, -0.32, 0);
    mesh(foot, G('box', 0.09, 0.035, 0.09), mats.lacquer, 0, -0.005, 0); // sandal sole
    mesh(foot, G('box', 0.08, 0.03, 0.19), mats.lacquer, 0, -0.03, 0.05);
    // straps
    const strap = mesh(foot, G('box', 0.095, 0.012, 0.02), clothM, 0, 0.005, 0.03);
  }
  buildLeg('R'); buildLeg('L');

  // ================= anchors & extras =================
  const weaponAnchor = new THREE.Group();
  weaponAnchor.position.set(0, -0.06, 0.02);
  joints.armR_hand.add(weaponAnchor);
  // saya (scabbard) hanging on the left hip
  const saya = new THREE.Group();
  saya.position.set(-0.16, 0.06, -0.1);
  saya.rotation.set(0.12, 0, -0.5);
  hips.add(saya);
  const trailBase = new THREE.Group(), trailTip = new THREE.Group();
  weaponAnchor.add(trailBase, trailTip);

  // contact blob shadow
  const blob = new THREE.Mesh(G('plane', 1.5, 1.5), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.85 }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.035;
  blob.renderOrder = 1;
  group.add(blob);

  let weaponGroup = null, helmetGroup = null;
  const extra = { chestPlate, sash, pauldronL, pauldronR, fur, thighL, thighR, mats };
  const all = [group];
  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  blob.castShadow = false;

  function setWeapon(model) {
    if (weaponGroup) weaponAnchor.remove(weaponGroup);
    weaponGroup = new THREE.Group();
    trailBase.position.set(0, 0, 0);
    trailTip.position.set(0, 0, 0);
    saya.children.length = 0;
    if (!model) { weaponAnchor.add(weaponGroup); return; }
    const metal = new THREE.MeshPhysicalMaterial({ color: model.color, metalness: 0.95, roughness: 0.18, envMapIntensity: 1.6, clearcoat: 0.6, clearcoatRoughness: 0.2 });
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hamonMat = new THREE.MeshStandardMaterial({ color: 0xdfe8f2, metalness: 0.7, roughness: 0.3, emissive: 0x2a3038, emissiveIntensity: 0.2 });
    const dark = M(0x241c14, { rough: 0.9 });
    const wrapA = M(0x2a2224, { rough: 0.95 });
    const wrapB = M(0x3e3236, { rough: 0.95 });
    const guardMat = M(0x3a3a44, { metal: 0.85, rough: 0.3, extra: { envMapIntensity: 1.2 } });
    const len = model.len || 1.1;
    switch (model.style) {
      case 'katana': case 'nodachi': {
        const wide = model.style === 'nodachi' ? 1.5 : 1.0;
        // tsuka (grip) with alternating wrap
        const grip = mesh(weaponGroup, G('box', 0.032 * wide, 0.24, 0.026 * wide), dark, 0, -0.11, 0);
        for (let i = 0; i < 5; i++) {
          mesh(weaponGroup, G('box', 0.036 * wide, 0.022, 0.03 * wide), i % 2 ? wrapA : wrapB, 0, -0.19 + i * 0.04, 0);
        }
        // kashira pommel
        mesh(weaponGroup, G('box', 0.036 * wide, 0.025, 0.03 * wide), guardMat, 0, -0.235, 0);
        // tsuba
        const guardKind = model.guard || 'round';
        if (guardKind === 'square') {
          mesh(weaponGroup, G('box', 0.1 * wide, 0.02, 0.1 * wide), guardMat, 0, 0.015, 0);
        } else if (guardKind === 'petal') {
          const t = mesh(weaponGroup, G('cyl', 0.055, 0.055, 0.014, 8), guardMat, 0, 0.015, 0);
          t.scale.set(1, 1, 0.5);
        } else {
          mesh(weaponGroup, G('cyl', 0.05, 0.05, 0.016, 12), guardMat, 0, 0.015, 0);
        }
        // blade: body + edge + hamon + tip
        const bladeLen = len;
        mesh(weaponGroup, G('box', 0.026 * wide, bladeLen, 0.011 * wide), metal, 0, 0.03 + bladeLen / 2, 0);
        const edge = mesh(weaponGroup, G('box', 0.008, bladeLen, 0.012 * wide), edgeMat, 0.012 * wide, 0.03 + bladeLen / 2, 0);
        const hamon = mesh(weaponGroup, G('box', 0.024 * wide, bladeLen * 0.96, 0.004), hamonMat, -0.004, 0.05 + bladeLen / 2, 0.004);
        // kissaki tip
        const tip = mesh(weaponGroup, G('cone', 0.016 * wide, 0.12, 4), metal, 0, 0.05 + bladeLen + 0.02, 0);
        tip.scale.set(1.3, 1, 0.6);
        trailBase.position.set(0, 0.02, 0);
        trailTip.position.set(0, 0.05 + bladeLen, 0);
        // saya on the hip
        const sm = M(model.color, { rough: 0.25, metal: 0.2, extra: { envMapIntensity: 1 } });
        mesh(saya, G('box', 0.034 * wide, len + 0.1, 0.02 * wide), sm, 0, (len + 0.1) / 2 - 0.15, 0);
        mesh(saya, G('box', 0.036 * wide, 0.03, 0.024 * wide), guardMat, 0, len - 0.13, 0);
        break;
      }
      case 'club': {
        mesh(weaponGroup, G('cyl', 0.03, 0.03, 0.32, 6), dark, 0, -0.05, 0);
        const headMat = M(0x5a4632, { rough: 0.95 });
        const head = mesh(weaponGroup, G('cyl', 0.075, 0.05, len, 9), headMat, 0, 0.12 + len / 2, 0);
        mesh(weaponGroup, G('sph', 0.08, 9, 7), M(0x3a3230, { rough: 0.9 }), 0, 0.12 + len, 0);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          mesh(weaponGroup, G('sph', 0.018, 5, 4), guardMat, Math.cos(a) * 0.07, 0.12 + len * (0.3 + (i % 3) * 0.25), Math.sin(a) * 0.07);
        }
        trailBase.position.set(0, 0.1, 0); trailTip.position.set(0, 0.12 + len, 0);
        break;
      }
      case 'spear': {
        mesh(weaponGroup, G('cyl', 0.02, 0.024, len, 7), M(0x6a5238, { rough: 0.85 }), 0, len / 2 - 0.2, 0);
        mesh(weaponGroup, G('cone', 0.05, 0.26, 6), metal, 0, len - 0.08, 0);
        const tassel = mesh(weaponGroup, G('cone', 0.06, 0.18, 6), M(0xb03030, { rough: 1 }), 0, len - 0.28, 0);
        tassel.scale.set(1, 1, 1);
        trailBase.position.set(0, len * 0.4, 0); trailTip.position.set(0, len, 0);
        break;
      }
      case 'bow': {
        const arc = mesh(weaponGroup, G('torus', 0.42, 0.018, 6, 14, Math.PI), M(0x5a4632, { rough: 0.6, extra: { envMapIntensity: 0.8 } }), 0, 0.15, 0);
        arc.rotation.y = Math.PI / 2;
        mesh(weaponGroup, G('cyl', 0.005, 0.005, 0.82, 4), M(0xd8d4c8), 0, 0.15, 0);
        break;
      }
      case 'claw': {
        for (let i = 0; i < 3; i++) {
          const c = mesh(weaponGroup, G('cone', 0.02, 0.24, 5), metal, (i - 1) * 0.05, 0.1, 0);
          c.rotation.x = 0.15;
        }
        break;
      }
      default: break;
    }
    weaponGroup.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    weaponAnchor.add(weaponGroup);
  }

  function setArmor(armor) {
    chestPlate.visible = false; sash.visible = false; pauldronL.visible = false; pauldronR.visible = false;
    fur.visible = false; thighL.visible = false; thighR.visible = false;
    lacingA.visible = lacingB.visible = lacingC.visible = false;
    if (!armor || !armor.model) return;
    mats.cloth.color.setHex(armor.model.tint);
    for (const p of armor.model.parts || []) {
      if (p === 'sash') sash.visible = true;
      if (p === 'plates') { chestPlate.visible = true; lacingA.visible = lacingB.visible = lacingC.visible = true; }
      if (p === 'pauldrons') { pauldronL.visible = true; pauldronR.visible = true; }
      if (p === 'fur') fur.visible = true;
    }
  }

  function setHelmet(helmet) {
    if (helmetGroup) { head.remove(helmetGroup); helmetGroup = null; }
    if (!helmet || !helmet.model) return;
    helmetGroup = new THREE.Group();
    const metal = M(0x5a5f6a, { rough: 0.3, metal: 0.85, extra: { envMapIntensity: 1.4 } });
    const gold = new THREE.MeshPhysicalMaterial({ color: 0xb8912e, metalness: 0.95, roughness: 0.22, envMapIntensity: 1.6 });
    switch (helmet.model.style) {
      case 'straw': {
        const brim = mesh(helmetGroup, G('cyl', 0.36, 0.05, 0.34, 12), M(0xb8a878, { rough: 1 }), 0, 0.21, 0);
        const top = mesh(helmetGroup, G('sph', 0.17, 10, 6), M(0xb8a878, { rough: 1 }), 0, 0.22, 0);
        top.scale.y = 0.5;
        break;
      }
      case 'mask': {
        mesh(helmetGroup, G('box', 0.2, 0.13, 0.05), metal, 0, 0.045, 0.095);
        mesh(helmetGroup, G('box', 0.24, 0.05, 0.06), metal, 0, 0.115, 0.09);
        // teeth ridges
        for (let i = 0; i < 4; i++) mesh(helmetGroup, G('box', 0.02, 0.05, 0.02), gold, -0.06 + i * 0.04, 0.0, 0.1);
        break;
      }
      case 'kabuto': {
        const bowl = mesh(helmetGroup, G('sph', 0.145, 12, 8), metal, 0, 0.19, 0);
        bowl.scale.set(1, 0.85, 1);
        // brim
        const brim = mesh(helmetGroup, G('cyl', 0.24, 0.2, 0.05, 12), metal, 0, 0.15, 0);
        // gold crescent maedate
        const crest = mesh(helmetGroup, G('box', 0.02, 0.16, 0.1), gold, 0, 0.32, 0.03);
        crest.rotation.x = -0.15;
        // side fukigaeshi
        for (const s of [-1, 1]) {
          const f = mesh(helmetGroup, G('box', 0.1, 0.1, 0.02), metal, s * 0.16, 0.15, 0.06);
          f.rotation.y = s * 0.5;
          mesh(helmetGroup, G('box', 0.09, 0.02, 0.025), gold, s * 0.16, 0.19, 0.06).rotation.y = s * 0.5;
        }
        // neck guard shikoro
        for (let i = 0; i < 3; i++) {
          const r = mesh(helmetGroup, G('cyl', 0.16 + i * 0.02, 0.16 + i * 0.02, 0.03, 10, 1), metal, 0, 0.09 - i * 0.05, -0.02);
        }
        // hair whiskers on topknot spot
        mesh(helmetGroup, G('cyl', 0.03, 0.015, 0.24, 6), M(0x1a1416, { rough: 1 }), 0, 0.3, -0.06).rotation.x = 0.7;
        break;
      }
    }
    helmetGroup.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
    head.add(helmetGroup);
  }

  setWeapon(opts.weapon || null);
  setArmor(opts.armor || null);
  if (opts.helmet) setHelmet(opts.helmet);
  if (opts.scale && opts.scale !== 1) {
    group.scale.setScalar(opts.scale);
    blob.position.y = 0.035;
  }

  return {
    group, body, joints, weaponAnchor, trailBase, trailTip, mats, extra, saya,
    height: 1.72 * (opts.scale || 1),
    setWeapon, setArmor, setHelmet,
    setVisible(v) { group.visible = v; },
    dispose() {
      mats.dispose();
      blob.material.dispose();
    },
  };
}
