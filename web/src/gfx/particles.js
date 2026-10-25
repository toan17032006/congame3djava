// GPU particle pool (additive points) + weather systems.
import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene, max = 900) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.baseCol = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.size = new Float32Array(max);
    this.head = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    for (let i = 0; i < max; i++) this.pos[i * 3 + 1] = -9999;
    scene.add(this.points);
    this.geo = geo; this.mat = mat;
  }

  spawn(p, opts = {}) {
    const n = opts.count || 8;
    const colors = Array.isArray(opts.color) ? opts.color : [opts.color || 0xffaa44];
    for (let k = 0; k < n; k++) {
      const i = this.head; this.head = (this.head + 1) % this.max;
      const spread = opts.spread !== undefined ? opts.spread : 1;
      const speed = (opts.speed || 3) * (0.5 + Math.random() * 0.8);
      const dir = opts.dir;
      this.pos[i * 3] = p.x + (Math.random() - 0.5) * spread;
      this.pos[i * 3 + 1] = p.y + (Math.random() - 0.5) * spread;
      this.pos[i * 3 + 2] = p.z + (Math.random() - 0.5) * spread;
      let vx = (Math.random() - 0.5) * 2, vy = Math.random() * 1.4, vz = (Math.random() - 0.5) * 2;
      const l = Math.hypot(vx, vy, vz) || 1;
      vx = vx / l * speed; vy = vy / l * speed; vz = vz / l * speed;
      if (dir) { vx = vx * 0.4 + dir.x * speed; vy = vy * 0.4 + dir.y * speed; vz = vz * 0.4 + dir.z * speed; }
      this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
      const c = new THREE.Color(colors[(Math.random() * colors.length) | 0]);
      this.baseCol[i * 3] = c.r; this.baseCol[i * 3 + 1] = c.g; this.baseCol[i * 3 + 2] = c.b;
      this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
      this.life[i] = this.maxLife[i] = opts.life || (0.4 + Math.random() * 0.4);
      this.grav[i] = opts.gravity !== undefined ? opts.gravity : -5;
      this.size[i] = opts.size || 1;
    }
  }

  update(dt) {
    const { pos, vel, life, maxLife, col, baseCol } = this;
    let any = false;
    for (let i = 0; i < this.max; i++) {
      if (life[i] <= 0) continue;
      any = true;
      life[i] -= dt;
      if (life[i] <= 0) { pos[i * 3 + 1] = -9999; continue; }
      vel[i * 3 + 1] += this.grav[i] * dt;
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      const f = life[i] / maxLife[i];
      col[i * 3] = baseCol[i * 3] * f;
      col[i * 3 + 1] = baseCol[i * 3 + 1] * f;
      col[i * 3 + 2] = baseCol[i * 3 + 2] * f;
    }
    if (any) {
      this.geo.attributes.position.needsUpdate = true;
      this.geo.attributes.color.needsUpdate = true;
    }
  }

  dispose() { this.geo.dispose(); this.mat.dispose(); this.points.parent?.remove(this.points); }
}

// Ambient weather: rain, petals, leaves, embers, ash — wraps around the player.
export class Weather {
  constructor(scene, type, area = 90) {
    this.type = type;
    this.area = area;
    const count = type === 'rain' ? 700 : type === 'none' ? 0 : 220;
    this.count = count;
    this.active = count > 0;
    if (!this.active) return;
    const geo = new THREE.BufferGeometry();
    this.p = new Float32Array(count * 3);
    this.v = new Float32Array(count * 3);
    const colArr = new Float32Array(count * 3);
    let colorA = [0.7, 0.75, 0.85], speed = [0, -22, 0], spread = 1;
    if (type === 'petals') { colorA = [1.0, 0.75, 0.8]; speed = [0.4, -0.7, 0.2]; }
    if (type === 'leaves') { colorA = [0.9, 0.6, 0.25]; speed = [0.5, -1.1, 0.3]; }
    if (type === 'embers') { colorA = [1.0, 0.45, 0.12]; speed = [0.2, 1.1, 0.15]; }
    if (type === 'ash') { colorA = [0.6, 0.55, 0.5]; speed = [0.3, -0.8, 0.2]; }
    if (type === 'snow') { colorA = [0.9, 0.95, 1.0]; speed = [0.3, -1.6, 0.2]; }
    this.color = new THREE.Color(...colorA);
    this.baseSpeed = speed;
    const mat = new THREE.PointsMaterial({
      size: type === 'rain' ? 0.06 : 0.09, color: this.color, transparent: true, opacity: type === 'rain' ? 0.55 : 0.8,
      depthWrite: false, blending: type === 'embers' || type === 'rain' ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    for (let i = 0; i < count; i++) {
      this.p[i * 3] = (Math.random() - 0.5) * area * 2;
      this.p[i * 3 + 1] = Math.random() * 18;
      this.p[i * 3 + 2] = (Math.random() - 0.5) * area * 2;
      colArr[i * 3] = colorA[0]; colArr[i * 3 + 1] = colorA[1]; colArr[i * 3 + 2] = colorA[2];
      this.v[i * 3] = speed[0] * (0.7 + Math.random() * 0.6);
      this.v[i * 3 + 1] = speed[1] * (0.7 + Math.random() * 0.6);
      this.v[i * 3 + 2] = speed[2] * (0.7 + Math.random() * 0.6);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.geo = geo; this.mat = mat;
  }

  update(dt, center) {
    if (!this.active) return;
    const a = this.area;
    for (let i = 0; i < this.count; i++) {
      let x = this.p[i * 3] + this.v[i * 3] * dt;
      let y = this.p[i * 3 + 1] + this.v[i * 3 + 1] * dt;
      let z = this.p[i * 3 + 2] + this.v[i * 3 + 2] * dt;
      if (this.type === 'petals' || this.type === 'leaves' || this.type === 'ash') {
        x += Math.sin(y * 2 + i) * dt * 0.6;
      }
      if (y < -0.5 || y > 20) { y = this.type === 'embers' ? 0.5 : 17; x = center.x + (Math.random() - 0.5) * a * 2; z = center.z + (Math.random() - 0.5) * a * 2; }
      if (Math.abs(x - center.x) > a) x = center.x - Math.sign(x - center.x) * a;
      if (Math.abs(z - center.z) > a) z = center.z - Math.sign(z - center.z) * a;
      this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z;
    }
    this.geo.attributes.position.needsUpdate = true;
  }

  dispose() {
    if (!this.active) return;
    this.geo.dispose(); this.mat.dispose(); this.points.parent?.remove(this.points);
  }
}
