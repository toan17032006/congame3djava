// Pose clips for the procedural humanoid. Angles in radians.
// Convention: negative shoulder/hip X raises limb forward; +X leans torso forward.
// '_pos' = hips offset, '_root' = [bodyRotX, bodyRotY].
const REST = {
  hips: [0, 0, 0], torso: [0.03, 0, 0], head: [0, 0, 0],
  armR_sh: [-0.3, 0, -0.18], armR_el: [-0.35, 0, 0], armR_hand: [0, 0, 0],
  armL_sh: [0.1, 0, 0.18], armL_el: [-0.35, 0, 0], armL_hand: [0, 0, 0],
  legR_hip: [0, 0, 0.02], legR_knee: [0.02, 0, 0], legR_foot: [0, 0, 0],
  legL_hip: [0, 0, -0.02], legL_knee: [0.02, 0, 0], legL_foot: [0, 0, 0],
};

function C(dur, loop, frames, events = []) {
  const tracks = {};
  for (const [t, pose] of frames) {
    for (const joint in pose) {
      if (!tracks[joint]) tracks[joint] = [{ t: 0, v: (REST[joint] || (joint === '_pos' ? [0, 0, 0] : joint === '_root' ? [0, 0] : [0, 0, 0])).slice() }];
      tracks[joint].push({ t, v: Array.isArray(pose[joint]) ? pose[joint] : [pose[joint], 0] });
    }
  }
  return { dur, loop, tracks, events };
}

export const CLIPS = {
  idle: C(2.6, true, [
    [0, { torso: [0.05, 0, 0], armR_sh: [-0.34, 0, -0.2], armL_sh: [0.12, 0, 0.2], _pos: [0, 0, 0] }],
    [1.3, { torso: [0.075, 0.03, 0], armR_sh: [-0.28, 0, -0.2], armL_sh: [0.16, 0, 0.2], head: [-0.04, 0.05, 0], _pos: [0, -0.015, 0] }],
    [2.6, { torso: [0.05, 0, 0], armR_sh: [-0.34, 0, -0.2], armL_sh: [0.12, 0, 0.2], head: [0, 0, 0], _pos: [0, 0, 0] }],
  ]),

  walk: C(0.95, true, [
    [0, { legR_hip: [-0.5, 0, 0.02], legR_knee: [0.1, 0, 0], legL_hip: [0.42, 0, -0.02], legL_knee: [0.55, 0, 0], armR_sh: [0.42, 0, -0.18], armL_sh: [-0.55, 0, 0.2], torso: [0.1, 0.06, 0], _pos: [0, -0.012, 0] }],
    [0.24, { legR_hip: [0.02, 0, 0.02], legR_knee: [0.35, 0, 0], legL_hip: [-0.05, 0, -0.02], legL_knee: [0.25, 0, 0], _pos: [0, 0.022, 0], torso: [0.09, 0.06, 0] }],
    [0.48, { legR_hip: [0.42, 0, 0.02], legR_knee: [0.55, 0, 0], legL_hip: [-0.5, 0, -0.02], legL_knee: [0.1, 0, 0], armR_sh: [-0.55, 0, -0.18], armL_sh: [0.42, 0, 0.2], torso: [0.1, -0.06, 0], _pos: [0, -0.012, 0] }],
    [0.72, { legR_hip: [-0.05, 0, 0.02], legR_knee: [0.25, 0, 0], legL_hip: [0.02, 0, -0.02], legL_knee: [0.35, 0, 0], _pos: [0, 0.022, 0], torso: [0.09, -0.06, 0] }],
    [0.95, { legR_hip: [-0.5, 0, 0.02], legR_knee: [0.1, 0, 0], legL_hip: [0.42, 0, -0.02], legL_knee: [0.55, 0, 0], armR_sh: [0.42, 0, -0.18], armL_sh: [-0.55, 0, 0.2], torso: [0.1, 0.06, 0], _pos: [0, -0.012, 0] }],
  ]),

  run: C(0.6, true, [
    [0, { legR_hip: [-0.95, 0, 0.02], legR_knee: [0.2, 0, 0], legL_hip: [0.75, 0, -0.02], legL_knee: [1.0, 0, 0], armR_sh: [0.85, 0, -0.2], armR_el: [-0.9, 0, 0], armL_sh: [-0.95, 0, 0.2], armL_el: [-1.1, 0, 0], torso: [0.24, 0.08, 0], _pos: [0, -0.03, 0] }],
    [0.15, { legR_hip: [-0.1, 0, 0.02], legR_knee: [0.6, 0, 0], legL_hip: [0.15, 0, -0.02], legL_knee: [0.7, 0, 0], _pos: [0, 0.035, 0], torso: [0.22, 0.08, 0] }],
    [0.3, { legR_hip: [0.75, 0, 0.02], legR_knee: [1.0, 0, 0], legL_hip: [-0.95, 0, -0.02], legL_knee: [0.2, 0, 0], armR_sh: [-0.95, 0, -0.2], armR_el: [-1.1, 0, 0], armL_sh: [0.85, 0, 0.2], armL_el: [-0.9, 0, 0], torso: [0.24, -0.08, 0], _pos: [0, -0.03, 0] }],
    [0.45, { legR_hip: [0.15, 0, 0.02], legR_knee: [0.7, 0, 0], legL_hip: [-0.1, 0, -0.02], legL_knee: [0.6, 0, 0], _pos: [0, 0.035, 0], torso: [0.22, -0.08, 0] }],
    [0.6, { legR_hip: [-0.95, 0, 0.02], legR_knee: [0.2, 0, 0], legL_hip: [0.75, 0, -0.02], legL_knee: [1.0, 0, 0], armR_sh: [0.85, 0, -0.2], armR_el: [-0.9, 0, 0], armL_sh: [-0.95, 0, 0.2], armL_el: [-1.1, 0, 0], torso: [0.24, 0.08, 0], _pos: [0, -0.03, 0] }],
  ]),

  sprint: C(0.48, true, [
    [0, { legR_hip: [-1.15, 0, 0.02], legR_knee: [0.25, 0, 0], legL_hip: [0.9, 0, -0.02], legL_knee: [1.2, 0, 0], armR_sh: [1.0, 0, -0.25], armR_el: [-1.2, 0, 0], armL_sh: [-1.15, 0, 0.25], armL_el: [-1.3, 0, 0], torso: [0.32, 0.08, 0], _pos: [0, -0.04, 0] }],
    [0.24, { legR_hip: [0.9, 0, 0.02], legR_knee: [1.2, 0, 0], legL_hip: [-1.15, 0, -0.02], legL_knee: [0.25, 0, 0], armR_sh: [-1.15, 0, -0.25], armR_el: [-1.3, 0, 0], armL_sh: [1.0, 0, 0.25], armL_el: [-1.2, 0, 0], torso: [0.32, -0.08, 0], _pos: [0, -0.04, 0] }],
    [0.48, { legR_hip: [-1.15, 0, 0.02], legR_knee: [0.25, 0, 0], legL_hip: [0.9, 0, -0.02], legL_knee: [1.2, 0, 0], armR_sh: [1.0, 0, -0.25], armR_el: [-1.2, 0, 0], armL_sh: [-1.15, 0, 0.25], armL_el: [-1.3, 0, 0], torso: [0.32, 0.08, 0], _pos: [0, -0.04, 0] }],
  ]),

  jump: C(0.45, false, [
    [0, { legR_hip: [-0.55, 0, 0.02], legR_knee: [1.0, 0, 0], legL_hip: [-0.55, 0, -0.02], legL_knee: [1.0, 0, 0], armR_sh: [-0.8, 0, -0.5], armL_sh: [-0.8, 0, 0.5], torso: [0.2, 0, 0], _pos: [0, -0.28, 0] }],
    [0.2, { legR_hip: [0.35, 0, 0.02], legR_knee: [0.3, 0, 0], legL_hip: [-0.2, 0, -0.02], legL_knee: [0.8, 0, 0], armR_sh: [-2.4, 0, -0.3], armL_sh: [-2.4, 0, 0.3], torso: [0.05, 0, 0], _pos: [0, -0.02, 0] }],
    [0.45, { legR_hip: [-0.3, 0, 0.02], legR_knee: [0.5, 0, 0], legL_hip: [0.15, 0, -0.02], legL_knee: [0.4, 0, 0], armR_sh: [-1.2, 0, -0.4], armL_sh: [-1.2, 0, 0.4], torso: [0.12, 0, 0], _pos: [0, -0.08, 0] }],
  ]),
  fall: C(0.8, true, [
    [0, { legR_hip: [-0.45, 0, 0.02], legR_knee: [0.8, 0, 0], legL_hip: [0.25, 0, -0.02], legL_knee: [0.5, 0, 0], armR_sh: [-1.0, 0, -0.9], armL_sh: [-1.0, 0, 0.9], torso: [0.1, 0, 0] }],
    [0.4, { legR_hip: [-0.2, 0, 0.05], legR_knee: [0.6, 0, 0], legL_hip: [0.1, 0, -0.05], legL_knee: [0.7, 0, 0], armR_sh: [-1.2, 0, -1.1], armL_sh: [-1.2, 0, 1.1], torso: [0.05, 0, 0] }],
    [0.8, { legR_hip: [-0.45, 0, 0.02], legR_knee: [0.8, 0, 0], legL_hip: [0.25, 0, -0.02], legL_knee: [0.5, 0, 0], armR_sh: [-1.0, 0, -0.9], armL_sh: [-1.0, 0, 0.9], torso: [0.1, 0, 0] }],
  ]),
  land: C(0.32, false, [
    [0, { legR_hip: [-0.7, 0, 0.02], legR_knee: [1.2, 0, 0], legL_hip: [-0.7, 0, -0.02], legL_knee: [1.2, 0, 0], torso: [0.35, 0, 0], _pos: [0, -0.32, 0] }],
    [0.32, { torso: [0.05, 0, 0], _pos: [0, 0, 0] }],
  ]),

  light1: C(0.55, false, [
    [0, { armR_sh: [-2.35, 0.3, -0.55], armR_el: [-0.9, 0, 0], torso: [0.0, 0.45, 0], hips: [0, 0.2, 0], legR_hip: [-0.3, 0, 0.02], legL_hip: [0.3, 0, -0.02], _pos: [0, -0.05, 0] }],
    [0.32, { armR_sh: [-0.45, -0.55, 0.45], armR_el: [-0.15, 0, 0], torso: [0.22, -0.5, 0], hips: [0, -0.25, 0], legR_hip: [0.25, 0, 0.02], legL_hip: [-0.3, 0, -0.02], _pos: [0.02, -0.1, 0] }],
    [0.55, { armR_sh: [-0.6, -0.35, 0.35], armR_el: [-0.25, 0, 0], torso: [0.15, -0.35, 0], _pos: [0, -0.08, 0] }],
  ], [{ t: 0.42, name: 'swing' }]),

  light2: C(0.5, false, [
    [0, { armR_sh: [-0.3, -0.6, 0.55], armR_el: [-0.2, 0, 0], torso: [0.1, -0.55, 0], hips: [0, -0.25, 0], _pos: [0, -0.08, 0] }],
    [0.28, { armR_sh: [-2.1, 0.25, -0.5], armR_el: [-0.6, 0, 0], torso: [0.05, 0.5, 0], hips: [0, 0.25, 0], _pos: [0, -0.05, 0] }],
    [0.5, { armR_sh: [-2.3, 0.3, -0.5], armR_el: [-0.8, 0, 0], torso: [0.02, 0.4, 0], _pos: [0, -0.06, 0] }],
  ], [{ t: 0.4, name: 'swing' }]),

  light3: C(0.62, false, [
    [0, { armR_sh: [-2.85, 0.05, -0.15], armR_el: [-0.5, 0, 0], armL_sh: [-2.6, 0, 0.2], torso: [-0.12, 0, 0], _pos: [0, -0.07, 0] }],
    [0.38, { armR_sh: [-0.35, 0, 0.05], armR_el: [-0.1, 0, 0], armL_sh: [-0.4, 0, 0.2], torso: [0.38, 0, 0], legR_knee: [0.5, 0, 0], legL_knee: [0.5, 0, 0], _pos: [0, -0.16, 0] }],
    [0.62, { armR_sh: [-0.55, 0, 0], torso: [0.25, 0, 0], _pos: [0, -0.1, 0] }],
  ], [{ t: 0.5, name: 'swing' }]),

  heavy1: C(0.85, false, [
    [0, { armR_sh: [-2.95, 0.15, -0.3], armR_el: [-0.7, 0, 0], armL_sh: [-0.6, 0.3, 0.4], torso: [-0.18, 0.3, 0], hips: [0, 0.3, 0], legR_hip: [0.2, 0, 0.02], _pos: [0, -0.06, 0] }],
    [0.5, { armR_sh: [-3.0, 0.1, -0.25], armR_el: [-0.8, 0, 0], torso: [-0.22, 0.35, 0], hips: [0, 0.35, 0], _pos: [0, -0.09, 0] }],
    [0.72, { armR_sh: [-0.3, -0.05, 0.05], armR_el: [-0.1, 0, 0], armL_sh: [-0.3, 0, 0.2], torso: [0.5, -0.2, 0], hips: [0, -0.3, 0], legR_knee: [0.6, 0, 0], legL_knee: [0.6, 0, 0], _pos: [0, -0.2, 0.03] }],
    [0.85, { armR_sh: [-0.5, 0, 0], torso: [0.35, -0.1, 0], _pos: [0, -0.12, 0] }],
  ], [{ t: 0.66, name: 'swing' }]),

  heavy2: C(0.9, false, [
    [0, { armR_sh: [-1.25, -0.65, -1.15], armR_el: [-0.4, 0, 0], torso: [0.05, 0.65, 0], hips: [0, 0.4, 0], _pos: [0, -0.08, 0] }],
    [0.55, { armR_sh: [-1.45, 0.65, 1.05], armR_el: [-0.2, 0, 0], torso: [0.12, -0.75, 0], hips: [0, -0.45, 0], legL_knee: [0.4, 0, 0], _pos: [0, -0.14, 0] }],
    [0.9, { armR_sh: [-1.2, 0.5, 0.9], torso: [0.06, -0.5, 0], _pos: [0, -0.08, 0] }],
  ], [{ t: 0.45, name: 'swing' }]),

  block: C(0.5, true, [
    [0, { armR_sh: [-1.15, 0.65, -0.2], armR_el: [-1.25, 0, 0], armL_sh: [-0.95, 0.5, 0.35], armL_el: [-1.1, 0, 0], torso: [0.14, 0.15, 0], legR_hip: [-0.25, 0, 0.02], legL_hip: [0.2, 0, -0.02], legR_knee: [0.3, 0, 0], _pos: [0, -0.07, 0] }],
    [0.25, { armR_sh: [-1.1, 0.65, -0.2], torso: [0.15, 0.15, 0], _pos: [0, -0.075, 0] }],
    [0.5, { armR_sh: [-1.15, 0.65, -0.2], armR_el: [-1.25, 0, 0], armL_sh: [-0.95, 0.5, 0.35], armL_el: [-1.1, 0, 0], torso: [0.14, 0.15, 0], _pos: [0, -0.07, 0] }],
  ]),

  parry: C(0.32, false, [
    [0, { armR_sh: [-1.15, 0.65, -0.2], armR_el: [-1.25, 0, 0], torso: [0.14, 0.15, 0], _pos: [0, -0.07, 0] }],
    [0.16, { armR_sh: [-1.0, -0.35, -0.85], armR_el: [-0.9, 0, 0], torso: [0.1, -0.3, 0], _pos: [0, -0.06, 0] }],
    [0.32, { armR_sh: [-1.15, 0.65, -0.2], armR_el: [-1.25, 0, 0], torso: [0.14, 0.15, 0], _pos: [0, -0.07, 0] }],
  ], [{ t: 0.14, name: 'clang' }]),

  dodge: C(0.52, false, [
    [0, { legR_hip: [-0.6, 0, 0.02], legR_knee: [1.3, 0, 0], legL_hip: [-0.6, 0, -0.02], legL_knee: [1.3, 0, 0], armR_sh: [-1.4, 0, -0.7], armL_sh: [-1.4, 0, 0.7], torso: [0.3, 0, 0], _pos: [0, -0.3, 0], _root: [0, 0] }],
    [0.2, { legR_knee: [1.7, 0, 0], legL_knee: [1.7, 0, 0], _pos: [0, -0.52, 0], _root: [1.8, 0] }],
    [0.38, { _pos: [0, -0.44, 0], _root: [4.6, 0] }],
    [0.52, { legR_hip: [-0.3, 0, 0.02], legR_knee: [0.5, 0, 0], legL_hip: [0.1, 0, -0.02], legL_knee: [0.4, 0, 0], torso: [0.12, 0, 0], _pos: [0, -0.06, 0], _root: [6.28318, 0] }],
  ], [{ t: 0.05, name: 'whoosh' }]),

  skill_iai: C(0.9, false, [
    [0, { armR_sh: [-0.5, 0.9, -0.3], armR_el: [-1.6, 0, 0], torso: [0.15, 0.55, 0], hips: [0, 0.45, 0], legR_hip: [-0.5, 0, 0.02], legR_knee: [0.9, 0, 0], legL_hip: [0.4, 0, -0.02], legL_knee: [0.7, 0, 0], _pos: [0, -0.3, 0] }],
    [0.4, { armR_sh: [-1.5, -0.4, 0.9], armR_el: [-0.1, 0, 0], torso: [0.2, -0.65, 0], hips: [0, -0.55, 0], legR_hip: [0.5, 0, 0.02], legL_hip: [-0.45, 0, -0.02], _pos: [0.04, -0.12, 0], _root: [0, -0.9] }],
    [0.9, { armR_sh: [-1.3, -0.2, 0.7], torso: [0.12, -0.45, 0], _pos: [0, -0.09, 0], _root: [0, -0.7] }],
  ], [{ t: 0.4, name: 'swing' }, { t: 0.05, name: 'whoosh' }]),

  skill_whirl: C(1.5, false, [
    [0, { armR_sh: [-1.5, 0, -1.45], armR_el: [-0.1, 0, 0], armL_sh: [-1.5, 0, 1.45], torso: [0.05, 0, 0], _pos: [0, -0.1, 0], _root: [0, 0] }],
    [0.35, { _root: [0, 2.1] }],
    [0.8, { _root: [0, 4.2] }],
    [1.25, { _root: [0, 6.28318] }],
    [1.5, { armR_sh: [-1.3, 0, -1.2], armL_sh: [-1.3, 0, 1.2], torso: [0.05, 0, 0], _pos: [0, -0.06, 0], _root: [0, 6.28318] }],
  ], [{ t: 0.3, name: 'swing' }, { t: 0.62, name: 'swing' }, { t: 0.9, name: 'swing' }]),

  skill_dash: C(0.5, false, [
    [0, { armR_sh: [-1.6, 0, 0], armR_el: [-0.1, 0, 0], armL_sh: [0.9, 0, 0.5], torso: [0.5, 0, 0], legR_hip: [-0.9, 0, 0.02], legL_hip: [0.7, 0, -0.02], legL_knee: [0.9, 0, 0], _pos: [0, -0.15, 0] }],
    [0.5, { armR_sh: [-1.4, 0, 0], torso: [0.3, 0, 0], legR_hip: [-0.4, 0, 0.02], _pos: [0, -0.08, 0] }],
  ], [{ t: 0.3, name: 'swing' }]),

  skill_guard: C(0.6, false, [
    [0, { armL_sh: [-2.9, 0, 0.2], armR_sh: [-2.7, 0, -0.2], torso: [-0.15, 0, 0], _pos: [0, -0.05, 0] }],
    [0.35, { armL_sh: [-0.35, 0, 0.3], armR_sh: [-0.3, 0, -0.3], torso: [0.5, 0, 0], legR_knee: [0.7, 0, 0], legL_knee: [0.7, 0, 0], _pos: [0, -0.26, 0] }],
    [0.6, { torso: [0.35, 0, 0], _pos: [0, -0.18, 0] }],
  ], [{ t: 0.35, name: 'thud' }]),

  stagger: C(0.5, false, [
    [0, { torso: [-0.42, 0, 0], head: [-0.3, 0, 0], armR_sh: [-0.1, 0, -0.7], armL_sh: [-0.1, 0, 0.7], _pos: [0, -0.06, -0.03] }],
    [0.28, { torso: [-0.3, 0.05, 0], _pos: [0, -0.08, -0.02] }],
    [0.5, { torso: [0.03, 0, 0], head: [0, 0, 0], armR_sh: [-0.3, 0, -0.18], armL_sh: [0.1, 0, 0.18], _pos: [0, 0, 0] }],
  ]),

  guardbreak: C(1.1, false, [
    [0, { torso: [-0.55, 0, 0], armR_sh: [-0.2, 0, -0.9], armL_sh: [-0.2, 0, 0.9], head: [-0.35, 0, 0], _pos: [0, -0.08, -0.05] }],
    [0.45, { legR_hip: [-1.1, 0, 0.02], legR_knee: [1.8, 0, 0], legL_hip: [-0.5, 0, -0.02], legL_knee: [1.4, 0, 0], torso: [0.3, 0, 0], _pos: [0, -0.62, 0] }],
    [1.1, { legR_hip: [-1.2, 0, 0.02], legR_knee: [1.9, 0, 0], legL_hip: [-0.55, 0, -0.02], legL_knee: [1.45, 0, 0], torso: [0.32, 0.05, 0], head: [0.15, 0, 0], _pos: [0, -0.66, 0] }],
  ]),

  parried: C(1.2, false, [
    [0, { torso: [-0.5, 0.2, 0], armR_sh: [-1.8, 0.4, -0.6], armR_el: [-0.9, 0, 0], head: [-0.3, 0, 0], _pos: [0, -0.12, -0.04] }],
    [0.5, { legR_hip: [-0.9, 0, 0.02], legR_knee: [1.4, 0, 0], torso: [0.2, 0, 0], _pos: [0, -0.4, 0] }],
    [1.2, { torso: [0.05, 0, 0], legR_hip: [-0.2, 0, 0.02], legR_knee: [0.4, 0, 0], _pos: [0, -0.05, 0] }],
  ]),

  hit: C(0.35, false, [
    [0, { torso: [-0.3, 0.15, 0], head: [-0.25, 0, 0], armR_sh: [-0.15, 0, -0.6], armL_sh: [-0.15, 0, 0.6], _pos: [0, -0.05, -0.03] }],
    [0.35, { torso: [0.03, 0, 0], head: [0, 0, 0], _pos: [0, 0, 0] }],
  ]),

  dead: C(1.4, false, [
    [0, { torso: [-0.3, 0, 0], head: [-0.4, 0, 0], armR_sh: [-0.4, 0, -0.5], armL_sh: [-0.4, 0, 0.5], _pos: [0, -0.08, -0.04], _root: [0, 0] }],
    [0.5, { torso: [-0.1, 0, 0], legR_knee: [0.6, 0, 0], legL_knee: [0.6, 0, 0], _pos: [0, -0.55, -0.1], _root: [-1.1, 0] }],
    [0.9, { armR_sh: [-0.2, 0, -1.4], armL_sh: [-0.2, 0, 1.4], legR_knee: [0.15, 0, 0], legL_knee: [0.15, 0, 0], _pos: [0, -0.82, -0.16], _root: [-1.57, 0] }],
    [1.4, { armR_sh: [-0.15, 0, -1.5], armL_sh: [-0.15, 0, 1.5], _pos: [0, -0.84, -0.16], _root: [-1.57, 0] }],
  ]),

  e_light: C(0.9, false, [
    [0, { armR_sh: [-2.2, 0.35, -0.5], armR_el: [-0.8, 0, 0], torso: [0, 0.4, 0], _pos: [0, -0.05, 0] }],
    [0.42, { armR_sh: [-0.5, -0.5, 0.4], armR_el: [-0.15, 0, 0], torso: [0.2, -0.45, 0], _pos: [0, -0.1, 0] }],
    [0.9, { armR_sh: [-0.7, -0.3, 0.3], torso: [0.1, -0.3, 0], _pos: [0, -0.06, 0] }],
  ], [{ t: 0.45, name: 'swing' }]),

  e_combo2: C(1.25, false, [
    [0, { armR_sh: [-2.3, 0.3, -0.55], armR_el: [-0.85, 0, 0], torso: [0, 0.45, 0], _pos: [0, -0.05, 0] }],
    [0.38, { armR_sh: [-0.5, -0.5, 0.4], armR_el: [-0.15, 0, 0], torso: [0.2, -0.5, 0], _pos: [0, -0.1, 0] }],
    [0.58, { armR_sh: [-0.35, -0.6, 0.55], armR_el: [-0.2, 0, 0], torso: [0.1, -0.55, 0], _pos: [0, -0.08, 0] }],
    [0.78, { armR_sh: [-2.0, 0.3, -0.5], armR_el: [-0.5, 0, 0], torso: [0.05, 0.5, 0], _pos: [0, -0.06, 0] }],
    [1.25, { armR_sh: [-2.2, 0.3, -0.5], torso: [0.02, 0.4, 0], _pos: [0, -0.05, 0] }],
  ], [{ t: 0.42, name: 'swing' }, { t: 0.72, name: 'swing' }]),

  e_overhead: C(1.4, false, [
    [0, { armR_sh: [-2.9, 0.1, -0.3], armR_el: [-0.6, 0, 0], armL_sh: [-2.7, 0, 0.3], torso: [-0.15, 0, 0], _pos: [0, -0.07, 0] }],
    [0.55, { armR_sh: [-3.0, 0.05, -0.25], torso: [-0.2, 0, 0], _pos: [0, -0.1, 0] }],
    [0.85, { armR_sh: [-0.35, 0, 0.05], armR_el: [-0.1, 0, 0], torso: [0.5, 0, 0], legR_knee: [0.6, 0, 0], legL_knee: [0.6, 0, 0], _pos: [0, -0.22, 0] }],
    [1.4, { armR_sh: [-0.55, 0, 0], torso: [0.3, 0, 0], _pos: [0, -0.1, 0] }],
  ], [{ t: 0.62, name: 'swing' }]),

  e_slam: C(1.8, false, [
    [0, { armR_sh: [-2.9, 0.05, -0.25], armR_el: [-0.5, 0, 0], armL_sh: [-2.9, 0, 0.25], armL_el: [-0.5, 0, 0], torso: [-0.18, 0, 0], _pos: [0, -0.08, 0] }],
    [0.55, { armR_sh: [-3.05, 0, -0.2], armL_sh: [-3.05, 0, 0.2], torso: [-0.24, 0, 0], _pos: [0, -0.12, 0] }],
    [1.1, { armR_sh: [-0.4, 0, 0.05], armR_el: [-0.1, 0, 0], armL_sh: [-0.4, 0, -0.05], torso: [0.55, 0, 0], legR_knee: [0.8, 0, 0], legL_knee: [0.8, 0, 0], _pos: [0, -0.3, 0] }],
    [1.8, { armR_sh: [-0.6, 0, 0], armL_sh: [-0.6, 0, 0], torso: [0.35, 0, 0], _pos: [0, -0.15, 0] }],
  ], [{ t: 0.62, name: 'thud' }]),

  e_sweep: C(1.2, false, [
    [0, { armR_sh: [-0.85, -0.8, -1.0], armR_el: [-0.3, 0, 0], torso: [0.2, 0.5, 0], legR_knee: [0.5, 0, 0], legL_knee: [0.5, 0, 0], _pos: [0, -0.18, 0] }],
    [0.62, { armR_sh: [-0.7, 0.8, 1.0], armR_el: [-0.15, 0, 0], torso: [0.25, -0.6, 0], _pos: [0, -0.2, 0] }],
    [1.2, { armR_sh: [-0.6, 0.5, 0.8], torso: [0.1, -0.4, 0], _pos: [0, -0.1, 0] }],
  ], [{ t: 0.5, name: 'swing' }]),

  e_spin: C(1.5, false, [
    [0, { armR_sh: [-1.5, 0, -1.45], armR_el: [-0.1, 0, 0], _pos: [0, -0.1, 0], _root: [0, 0] }],
    [0.5, { _root: [0, 2.1] }],
    [1.0, { _root: [0, 4.2] }],
    [1.4, { _root: [0, 6.28318] }],
    [1.5, { armR_sh: [-1.3, 0, -1.2], _pos: [0, -0.06, 0], _root: [0, 6.28318] }],
  ], [{ t: 0.4, name: 'swing' }, { t: 0.75, name: 'swing' }]),

  e_thrust: C(1.0, false, [
    [0, { armR_sh: [-0.9, 0.5, -0.3], armR_el: [-1.5, 0, 0], torso: [0.05, 0.4, 0], _pos: [0, -0.06, 0] }],
    [0.5, { armR_sh: [-1.55, 0, 0.02], armR_el: [-0.08, 0, 0], torso: [0.3, -0.35, 0], legR_hip: [-0.4, 0, 0.02], _pos: [0, -0.1, 0.05] }],
    [1.0, { armR_sh: [-1.0, 0.3, -0.2], armR_el: [-0.9, 0, 0], torso: [0.08, 0.1, 0], _pos: [0, -0.06, 0] }],
  ], [{ t: 0.45, name: 'swing' }]),

  e_cast: C(1.6, false, [
    [0, { armL_sh: [-2.5, 0, 0.5], armL_el: [-0.5, 0, 0], torso: [-0.1, 0, 0], _pos: [0, -0.05, 0] }],
    [0.7, { armL_sh: [-2.7, 0, 0.55], armL_el: [-0.35, 0, 0], torso: [-0.15, 0, 0], _pos: [0, -0.07, 0] }],
    [1.15, { armL_sh: [-1.5, 0, 0.4], armL_el: [-0.1, 0, 0], torso: [0.3, 0, 0], _pos: [0, -0.1, 0] }],
    [1.6, { armL_sh: [-0.5, 0, 0.3], torso: [0.1, 0, 0], _pos: [0, -0.05, 0] }],
  ], [{ t: 1.05, name: 'cast' }]),

  pickup: C(0.7, false, [
    [0, { torso: [0.55, 0, 0], armL_sh: [-1.55, 0, 0.1], armL_el: [-0.2, 0, 0], legR_knee: [0.4, 0, 0], _pos: [0, -0.18, 0.04] }],
    [0.45, { torso: [0.6, 0, 0], armL_sh: [-1.65, 0, 0.1], _pos: [0, -0.2, 0.04] }],
    [0.7, { torso: [0.05, 0, 0], armL_sh: [0.1, 0, 0.18], _pos: [0, 0, 0] }],
  ]),

  interact: C(1.0, false, [
    [0, { legR_hip: [-1.1, 0, 0.02], legR_knee: [1.8, 0, 0], torso: [0.45, 0, 0], armR_sh: [-1.2, 0.4, -0.3], _pos: [0, -0.55, 0] }],
    [0.5, { torso: [0.5, 0, 0], _pos: [0, -0.58, 0] }],
    [1.0, { torso: [0.05, 0, 0], armR_sh: [-0.3, 0, -0.18], legR_hip: [0, 0, 0.02], legR_knee: [0.02, 0, 0], _pos: [0, 0, 0] }],
  ]),

  bow: C(1.2, false, [
    [0, { torso: [0.05, 0, 0], _pos: [0, 0, 0] }],
    [0.45, { torso: [0.5, 0, 0], head: [0.2, 0, 0], armR_sh: [-0.5, 0, -0.3], armL_sh: [-0.5, 0, 0.3], _pos: [0, -0.05, 0] }],
    [0.9, { torso: [0.5, 0, 0], head: [0.2, 0, 0], _pos: [0, -0.05, 0] }],
    [1.2, { torso: [0.05, 0, 0], head: [0, 0, 0], armR_sh: [-0.3, 0, -0.18], armL_sh: [0.1, 0, 0.18], _pos: [0, 0, 0] }],
  ]),
};

// alias: boss e_cast reuse; add fire tint handled by vfx
CLIPS.fire_nova = CLIPS.e_slam;
CLIPS.fire_ring = CLIPS.e_cast;
CLIPS.shadow_fan = CLIPS.e_cast;
