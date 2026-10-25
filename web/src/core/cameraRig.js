// Third/first person camera with orbit, lock-on framing, collision clamp, shake, FOV kick.
import { clamp, damp, angleDamp } from './utils.js';

export class CameraRig {
  constructor(camera, input) {
    this.camera = camera;
    this.input = input;
    this.mode = 'third';           // 'third' | 'first'
    this.yaw = 0; this.pitch = 0.32;
    this.dist = 5.4;
    this.sensitivity = 0.0022;
    this.invertY = false;
    this.lockTarget = null;
    this.trauma = 0;               // shake energy 0..1
    this._shakeT = 0;
    this.baseFov = 66;
    this._kick = 0;
    this._firstPersonWeapon = null; // optional overlay rig
    this.cinematic = null;         // {t, dur, from, to, boss} — boss intro dolly
    this._cinPivot = null;
    this.onCinematicEnd = null;
  }

  setLockTarget(t) { this.lockTarget = t; }
  toggleMode() {
    this.mode = this.mode === 'third' ? 'first' : 'third';
    return this.mode;
  }

  // short skippable boss-intro dolly: side sweep → normal follow
  playBossIntro(boss, player) {
    if (!boss || !player) return false;
    this.mode = 'third';
    this.yaw = Math.atan2(player.pos.x - boss.pos.x, player.pos.z - boss.pos.z) + 0.95;
    this.pitch = 0.04;
    this.dist = 9.5;
    this.cinematic = { t: 0, dur: 2.8, boss,
      from: { yaw: this.yaw, pitch: 0.04, dist: 9.5 },
      to: { yaw: 0, pitch: 0.3, dist: 5.4 } };
    return true;
  }

  skipCinematic() {
    if (!this.cinematic) return false;
    this.yaw = this.cinematic.to.yaw;
    this.pitch = this.cinematic.to.pitch;
    this.dist = this.cinematic.to.dist;
    this.cinematic = null;
    this._cinPivot = null;
    if (this.onCinematicEnd) this.onCinematicEnd();
    return true;
  }
  shake(amount) { this.trauma = clamp(this.trauma + amount, 0, 1); }
  fovKick(amount) { this._kick = Math.min(this._kick + amount, 10); }

  _applyMouse(dt) {
    const m = this.input.consumeMouse();
    if (this.cinematic) return; // mouse ignored while the intro dolly plays
    if (this.input.pointerLocked) {
      this.yaw -= m.dx * this.sensitivity;
      this.pitch += (this.invertY ? 1 : -1) * m.dy * this.sensitivity;
    }
    this.pitch = clamp(this.pitch, -0.5, 1.25);
    if (m.wheel) this.dist = clamp(this.dist + m.wheel * 0.55, 2.4, 8.5);
  }

  update(dt, targetPos, world, sprinting) {
    this._applyMouse(dt);
    this._cinPivot = null;

    // boss intro dolly
    if (this.cinematic) {
      const c = this.cinematic;
      c.t += dt;
      const f = Math.min(c.t / c.dur, 1);
      const e = f * f * (3 - 2 * f);
      this.yaw = c.from.yaw + (c.to.yaw - c.from.yaw) * e;
      this.pitch = c.from.pitch + (c.to.pitch - c.from.pitch) * e;
      this.dist = c.from.dist + (c.to.dist - c.from.dist) * e;
      // pivot biased toward the boss, relaxing toward the player as it ends
      this._cinPivot = {
        x: targetPos.x + (c.boss.pos.x - targetPos.x) * 0.5 * (1 - e),
        z: targetPos.z + (c.boss.pos.z - targetPos.z) * 0.5 * (1 - e),
      };
      if (f >= 1) { this.cinematic = null; if (this.onCinematicEnd) this.onCinematicEnd(); }
    }

    // lock-on framing
    if (this.lockTarget && !this.lockTarget.dead) {
      const t = this.lockTarget.pos;
      const wantYaw = Math.atan2(t.x - targetPos.x, t.z - targetPos.z);
      const d = Math.hypot(t.x - targetPos.x, t.z - targetPos.z);
      const wantPitch = clamp(0.25 - (t.y - targetPos.y) / Math.max(d, 0.001) * 0.6, -0.3, 0.8);
      this.yaw = angleDamp(this.yaw, wantYaw, 8, dt);
      this.pitch = damp(this.pitch, wantPitch, 8, dt);
    } else if (this.lockTarget && this.lockTarget.dead) {
      this.lockTarget = null;
    }

    const pivotY = targetPos.y + (this.mode === 'first' ? 1.58 : 1.5);

    if (this.mode === 'first') {
      const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      const fx = Math.sin(this.yaw) * cp, fz = Math.cos(this.yaw) * cp;
      this.camera.position.set(targetPos.x + fx * 0.25, pivotY - sp * 0.2, targetPos.z + fz * 0.25);
      this.camera.rotation.set(0, 0, 0);
      this.camera.rotateY(this.yaw + Math.PI);
      this.camera.rotateX(-this.pitch);
      this._applyShake(dt);
      this._fov(dt, sprinting);
      return;
    }

    // third person orbit
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const dirX = Math.sin(this.yaw) * cp, dirY = sp, dirZ = Math.cos(this.yaw) * cp;
    let dist = this.dist;
    // pivot shifts toward lock target to frame both
    let px = targetPos.x, pz = targetPos.z;
    if (this._cinPivot) { px = this._cinPivot.x; pz = this._cinPivot.z; }
    else if (this.lockTarget && !this.lockTarget.dead) {
      px = targetPos.x + (this.lockTarget.pos.x - targetPos.x) * 0.22;
      pz = targetPos.z + (this.lockTarget.pos.z - targetPos.z) * 0.22;
    }
    // collision: shorten distance if terrain/colliders block
    for (let step = 0; step < 6; step++) {
      const cx = px + dirX * dist, cy = pivotY + dirY * dist, cz = pz + dirZ * dist;
      const ground = world ? world.groundAt(cx, cz) : -100;
      const blocked = cy < ground + 0.35 || (world && world.segmentBlocked(px, pivotY, pz, cx, cy, cz));
      if (!blocked) break;
      dist *= 0.72;
      if (dist < 1.1) break;
    }
    const camX = px + dirX * dist, camY = pivotY + dirY * dist, camZ = pz + dirZ * dist;
    this.camera.position.set(camX, Math.max(camY, (world ? world.groundAt(camX, camZ) : -100) + 0.3), camZ);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotateY(this.yaw);
    this.camera.rotateX(-this.pitch);
    this._applyShake(dt);
    this._fov(dt, sprinting);
  }

  _applyShake(dt) {
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this._shakeT += dt * 30;
    if (this.trauma > 0.001) {
      const s = this.trauma * this.trauma * 0.35;
      this.camera.position.x += Math.sin(this._shakeT * 1.1) * s;
      this.camera.position.y += Math.cos(this._shakeT * 1.7) * s * 0.7;
      this.camera.position.z += Math.sin(this._shakeT * 1.3) * s;
      this.camera.rotateZ(Math.sin(this._shakeT * 0.9) * s * 0.05);
    }
  }

  _fov(dt, sprinting) {
    this._kick = damp(this._kick, 0, 4, dt);
    const target = this.baseFov + (sprinting ? 6 : 0) + this._kick;
    this.camera.fov = damp(this.camera.fov, target, 6, dt);
    this.camera.updateProjectionMatrix();
  }

  // world-space view direction on XZ plane (camera-relative movement)
  flatForward() { return { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) }; }
  flatRight() { return { x: Math.cos(this.yaw), z: -Math.sin(this.yaw) }; }
}
