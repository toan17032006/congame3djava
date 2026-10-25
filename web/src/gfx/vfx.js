// Combat/world VFX: slash arcs, telegraphs, damage popups, lock-on marker, fire zones.
import * as THREE from 'three';
import { G } from './materials.js';

function makeArcMesh() {
  const geo = G('torus', 1, 0.045, 3, 24, Math.PI * 0.85);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffe8c0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.z = -Math.PI * 0.425;
  return m;
}

function makePopupTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 160; canvas.height = 80;
  const tex = new THREE.CanvasTexture(canvas);
  return { canvas, tex };
}

export class Vfx {
  constructor(scene) {
    this.scene = scene;
    this.arcs = [];
    this.telegraphs = [];
    this.popups = [];
    this.zones = [];
    this.marker = null;
    for (let i = 0; i < 8; i++) {
      const m = makeArcMesh();
      m.visible = false;
      scene.add(m);
      this.arcs.push({ mesh: m, t: 0, dur: 0 });
    }
    for (let i = 0; i < 10; i++) {
      const geo = G('ring', 0.86, 1, 24);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      scene.add(m);
      this.telegraphs.push({ mesh: m, t: 0, dur: 0, r: 1 });
    }
    for (let i = 0; i < 16; i++) {
      const { canvas, tex } = makePopupTexture();
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false });
      const sp = new THREE.Sprite(mat);
      sp.scale.set(1.5, 0.75, 1);
      sp.visible = false;
      sp.renderOrder = 999;
      scene.add(sp);
      this.popups.push({ sp, canvas, tex, t: 0, dur: 0 });
    }
  }

  slashArc(pos, yaw, range = 2.4, color = 0xffe8c0) {
    const slot = this.arcs.find((a) => a.t >= a.dur) || this.arcs[0];
    slot.t = 0; slot.dur = 0.16;
    slot.mesh.visible = true;
    slot.mesh.material.color.setHex(color);
    slot.mesh.position.set(pos.x, pos.y + 1.15, pos.z);
    slot.mesh.rotation.y = yaw + Math.PI * 0.075;
    slot.mesh.scale.setScalar(range * 0.62);
    return slot;
  }

  telegraph(pos, radius, dur, color = 0xff3a2a) {
    const slot = this.telegraphs.find((t) => t.t >= t.dur) || this.telegraphs[0];
    slot.t = 0; slot.dur = dur; slot.r = radius;
    slot.mesh.visible = true;
    slot.mesh.material.color.setHex(color);
    slot.mesh.position.set(pos.x, pos.y + 0.06, pos.z);
    slot.mesh.scale.setScalar(0.001);
    return slot;
  }

  popup(pos, text, color = '#ffffff', big = false) {
    const slot = this.popups.find((p) => p.t >= p.dur) || this.popups[0];
    slot.t = 0; slot.dur = 0.9;
    const ctx = slot.canvas.getContext('2d');
    ctx.clearRect(0, 0, 160, 80);
    ctx.font = `bold ${big ? 44 : 32}px Georgia, serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineWidth = 6;
    ctx.strokeText(text, 80, 40);
    ctx.fillStyle = color;
    ctx.fillText(text, 80, 40);
    slot.tex.needsUpdate = true;
    slot.sp.visible = true;
    slot.sp.position.set(pos.x + (Math.random() - 0.5) * 0.4, pos.y + 1.9, pos.z + (Math.random() - 0.5) * 0.4);
    const sc = big ? 2.0 : 1.3;
    slot.sp.scale.set(sc, sc * 0.5, 1);
  }

  setLockMarker(entity) {
    if (this.marker) { this.marker.parent?.remove(this.marker); this.marker = null; }
    if (!entity) return;
    const geo = G('ring', 0.42, 0.5, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd257, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false, depthTest: false });
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = 998;
    entity.rig.group.add(m);
    m.position.y = entity.def && entity.def.bossPhases ? 3.6 : 2.15;
    this.marker = m;
  }

  update(dt) {
    for (const a of this.arcs) {
      if (a.t >= a.dur) { a.mesh.visible = false; continue; }
      a.t += dt;
      const f = a.t / a.dur;
      a.mesh.material.opacity = 0.9 * (1 - f);
      a.mesh.scale.setScalar(a.mesh.scale.x * (1 + dt * 2.5));
      if (a.t >= a.dur) a.mesh.visible = false;
    }
    for (const t of this.telegraphs) {
      if (t.t >= t.dur) { t.mesh.visible = false; continue; }
      t.t += dt;
      const f = t.t / t.dur;
      t.mesh.scale.setScalar(t.r * Math.min(f * 2.4, 1));
      t.mesh.material.opacity = 0.25 + 0.45 * Math.abs(Math.sin(f * Math.PI * 3));
      if (t.t >= t.dur) t.mesh.visible = false;
    }
    for (const p of this.popups) {
      if (p.t >= p.dur) { p.sp.visible = false; continue; }
      p.t += dt;
      const f = p.t / p.dur;
      p.sp.position.y += dt * 1.1;
      p.sp.material.opacity = 1 - f * f;
      if (p.t >= p.dur) p.sp.visible = false;
    }
  }
}
