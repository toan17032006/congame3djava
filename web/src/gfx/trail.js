// Ribbon weapon trail: samples blade base+tip each frame into a fading additive strip.
import * as THREE from 'three';

const N = 22;

export class Trail {
  constructor(scene, color = 0xcfe0ff) {
    this.color = new THREE.Color(color);
    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('color', this.colAttr);
    const idx = [];
    for (let i = 0; i < N - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, b, c, b, d, c);
    }
    geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    this.mesh.visible = false;
    this.scene = scene;
    scene.add(this.mesh);
    this.baseHist = [], this.tipHist = [];
    this._v1 = new THREE.Vector3(); this._v2 = new THREE.Vector3();
    this.strength = 0;
  }

  setColor(hex) { this.color.setHex(hex); }

  update(active, rig, dt) {
    if (!rig || !rig.trailBase) return;
    rig.trailBase.getWorldPosition(this._v1);
    rig.trailTip.getWorldPosition(this._v2);
    this.baseHist.unshift(this._v1.clone());
    this.tipHist.unshift(this._v2.clone());
    if (this.baseHist.length > N) { this.baseHist.length = N; this.tipHist.length = N; }
    this.strength = active ? Math.min(1, this.strength + dt * 12) : Math.max(0, this.strength - dt * 5);
    if (this.strength <= 0.01) { this.mesh.visible = false; return; }
    this.mesh.visible = true;
    const pa = this.posAttr.array, ca = this.colAttr.array;
    const len = this.baseHist.length;
    for (let i = 0; i < N; i++) {
      const j = Math.min(i, len - 1);
      const b = this.baseHist[j], t = this.tipHist[j];
      pa[i * 6] = b.x; pa[i * 6 + 1] = b.y; pa[i * 6 + 2] = b.z;
      pa[i * 6 + 3] = t.x; pa[i * 6 + 4] = t.y; pa[i * 6 + 5] = t.z;
      const f = Math.pow(1 - i / (N - 1), 1.8) * this.strength;
      const r = this.color.r * f, g = this.color.g * f, bl = this.color.b * f;
      ca[i * 6] = r; ca[i * 6 + 1] = g; ca[i * 6 + 2] = bl;
      ca[i * 6 + 3] = r; ca[i * 6 + 4] = g; ca[i * 6 + 5] = bl;
    }
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
