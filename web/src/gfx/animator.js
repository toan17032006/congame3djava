// Pose-clip animator with crossfade blending and event firing.
// Clips: { dur, loop, tracks: {joint: [{t, v:[x,y,z]}]}, events: [{t, name, data}] }
// Special tracks: '_pos' (hips position offset), '_root' ([rootRotX, rootRotY]).
import { lerp, angleWrap } from '../core/utils.js';

const REST = {
  hips: [0, 0, 0], torso: [0.03, 0, 0], head: [0, 0, 0],
  armR_sh: [-0.3, 0, -0.18], armR_el: [-0.35, 0, 0], armR_hand: [0, 0, 0],
  armL_sh: [0.1, 0, 0.18], armL_el: [-0.35, 0, 0], armL_hand: [0, 0, 0],
  legR_hip: [0, 0, 0.02], legR_knee: [0.02, 0, 0], legR_foot: [0, 0, 0],
  legL_hip: [0, 0, -0.02], legL_knee: [0.02, 0, 0], legL_foot: [0, 0, 0],
};
const HIPS_BASE_Y = 0.98;

export class Animator {
  constructor(rig, clips) {
    this.rig = rig;
    this.joints = rig.joints;
    this.clips = clips;
    this.current = null;
    this.prev = null;
    this.blendT = 1; this.blendDur = 0.12;
    this._fired = [];
    this.onEvent = null;
    this.doneCallback = null;
    this.enabled = true;
  }

  get name() { return this.current ? this.current.name : ''; }
  get timeNorm() { return this.current ? Math.min(this.current.t / this.current.clip.dur, 1) : 0; }

  play(name, opts = {}) {
    const clip = this.clips[name];
    if (!clip) return false;
    if (this.current && this.current.name === name && clip.loop && !opts.restart) return false;
    if (this.current && this.current.name === name && !clip.loop && this.current.t < this.current.clip.dur && !opts.restart) return false;
    if (this.current) this.prev = { ...this.current };
    this.current = { name, clip, t: 0, speed: opts.speed || 1, loop: clip.loop };
    this.blendT = 0;
    this.blendDur = opts.blend !== undefined ? opts.blend : 0.12;
    this._fired = [];
    this.doneCallback = opts.onDone || null;
    return true;
  }

  update(dt) {
    if (!this.current || !this.enabled) return;
    const cur = this.current;
    cur.t += dt * cur.speed;
    const dur = cur.clip.dur;
    // fire events (once per playback)
    for (let i = 0; i < cur.clip.events.length; i++) {
      if (this._fired.includes(i)) continue;
      const ev = cur.clip.events[i];
      if (cur.t >= ev.t * dur) {
        this._fired.push(i);
        if (this.onEvent) this.onEvent(ev.name, ev.data);
      }
    }
    if (cur.t >= dur) {
      if (cur.loop) { cur.t %= dur; this._fired = []; }
      else {
        cur.t = dur;
        const cb = this.doneCallback; this.doneCallback = null;
        if (cb) cb();
      }
    }
    if (this.blendT < 1) this.blendT = Math.min(1, this.blendT + dt / Math.max(this.blendDur, 0.001));
    this._apply();
  }

  _samplePose(entry, t) {
    const pose = {};
    const tracks = entry.clip.tracks;
    for (const joint in tracks) {
      const track = tracks[joint];
      let v;
      if (t <= track[0].t) v = track[0].v;
      else if (t >= track[track.length - 1].t) v = track[track.length - 1].v;
      else {
        let i = 0;
        while (i < track.length - 1 && track[i + 1].t < t) i++;
        const a = track[i], b = track[i + 1];
        const f = (t - a.t) / Math.max(b.t - a.t, 0.0001);
        v = [lerp(a.v[0], b.v[0], f), lerp(a.v[1], b.v[1], f), lerp(a.v[2], b.v[2], f)];
      }
      pose[joint] = v;
    }
    return pose;
  }

  _apply() {
    const J = this.joints;
    const rest = REST;
    const cur = this._samplePose(this.current, this.current.t);
    let prevPose = null, w = 1;
    if (this.prev && this.blendT < 1) { prevPose = this._samplePose(this.prev, Math.min(this.prev.t, this.prev.clip.dur)); w = this.blendT; }

    const setJoint = (name) => {
      const j = J[name];
      if (!j) return;
      const c = cur[name] || rest[name] || [0, 0, 0];
      const p = (prevPose && (prevPose[name] || rest[name])) || rest[name] || [0, 0, 0];
      j.rotation.set(lerp(p[0], c[0], w), angleWrap(lerp(p[1], c[1], w)), angleWrap(lerp(p[2], c[2], w)));
    };
    for (const name of ['hips', 'torso', 'head', 'armR_sh', 'armR_el', 'armR_hand', 'armL_sh', 'armL_el', 'armL_hand',
      'legR_hip', 'legR_knee', 'legR_foot', 'legL_hip', 'legL_knee', 'legL_foot']) setJoint(name);

    // hips position
    const posCur = cur._pos || [0, 0, 0];
    const posPrev = (prevPose && prevPose._pos) || [0, 0, 0];
    this.joints.hips.position.set(
      lerp(posPrev[0], posCur[0], w),
      HIPS_BASE_Y + lerp(posPrev[1], posCur[1], w),
      lerp(posPrev[2], posCur[2], w));
    // root rotation (inner body wrapper; group carries yaw+position)
    const rCur = cur._root || [0, 0];
    let rPrevX = ((prevPose && prevPose._root) || [0, 0])[0];
    const rPrevY = ((prevPose && prevPose._root) || [0, 0])[1];
    if (rPrevX > 4.7 && rCur[0] < 1.6) rPrevX -= Math.PI * 2; // roll wrap
    this.rig.body.rotation.x = lerp(rPrevX, rCur[0], w);
    this.rig.body.rotation.y = angleWrap(lerp(rPrevY, rCur[1], w));
  }
}
