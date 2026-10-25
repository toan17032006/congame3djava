// Keyboard + mouse input with rebindable actions, repeat-guard and UI-focus gating.
import { ACTIONS } from '../data/keys.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.binds = {}; // action -> KeyboardEvent.code
    for (const [action, def] of Object.entries(ACTIONS)) this.binds[action] = def.default;
    this.codeToAction = {};
    this._rebuildMap();

    this.held = new Set();      // actions currently down
    this.pressed = new Set();   // actions pressed this frame (edge)
    this.mouseDX = 0; this.mouseDY = 0;
    this.wheel = 0;
    this.pointerLocked = false;
    this.enabled = true;        // false while UI/pause owns input
    this.onEscape = null;       // callback for Escape (always fires)

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') { if (this.onEscape) this.onEscape(); return; }
      if (e.repeat) return; // guard OS key-repeat: one press = one action
      if (e.code === 'Tab') e.preventDefault();
      const action = this.codeToAction[e.code];
      if (!action || !this.enabled) return;
      if (!this.held.has(action)) this.pressed.add(action);
      this.held.add(action);
    });
    window.addEventListener('keyup', (e) => {
      const action = this.codeToAction[e.code];
      if (action) this.held.delete(action);
    });
    window.addEventListener('blur', () => { this.held.clear(); });

    canvas.addEventListener('mousedown', (e) => {
      if (!this.pointerLocked && this.enabled) canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === canvas;
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked || !this.enabled) return;
      this.mouseDX += e.movementX || 0;
      this.mouseDY += e.movementY || 0;
    });
    document.addEventListener('wheel', (e) => {
      if (!this.pointerLocked || !this.enabled) return;
      this.wheel += Math.sign(e.deltaY);
    }, { passive: true });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _rebuildMap() {
    this.codeToAction = {};
    for (const [action, code] of Object.entries(this.binds)) this.codeToAction[code] = action;
  }

  rebind(action, code) {
    if (!ACTIONS[action]) return false;
    this.binds[action] = code;
    this._rebuildMap();
    return true;
  }

  isDown(action) { return this.enabled && this.held.has(action); }
  wasPressed(action) { return this.enabled && this.pressed.has(action); }

  // WASD axis in local space (x: right, z: forward), normalized
  moveAxis() {
    const x = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
    const z = (this.isDown('forward') ? 1 : 0) - (this.isDown('back') ? 1 : 0);
    const len = Math.hypot(x, z);
    return len > 0 ? { x: x / len, z: z / len, len: 1 } : { x: 0, z: 0, len: 0 };
  }

  consumeMouse() {
    const d = { dx: this.mouseDX, dy: this.mouseDY, wheel: this.wheel };
    this.mouseDX = 0; this.mouseDY = 0; this.wheel = 0;
    return d;
  }

  endFrame() { this.pressed.clear(); }

  releasePointer() { if (document.pointerLockElement) document.exitPointerLock(); }
  requestPointer() { if (!document.pointerLockElement) this.canvas.requestPointerLock(); }
}
