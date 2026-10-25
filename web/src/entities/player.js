// Player controller: camera-relative movement, combos, dodge, block/parry, skills, lock-on.
import { Character } from './character.js';
import { PLAYER_SKILLS } from '../data/bosses.js';
import { clamp } from '../core/utils.js';

const CLIP_DUR = { light1: 0.55, light2: 0.5, light3: 0.62, heavy1: 0.85, heavy2: 0.9 };

export class Player extends Character {
  constructor(game, cfg) {
    super(game, { ...cfg, isPlayer: true, faction: 'player' });
    this.state = 'move';          // move | dodge | attack | skill | interact | dead
    this.moveMode = 'idle';       // idle | walk | run | sprint
    this.comboIdx = 0;
    this.comboKind = null;        // 'light' | 'heavy'
    this.buffered = null;         // 'light' | 'heavy' | skillId
    this.dodgeCount = 0;
    this.dodgeCd = 0;
    this.stepT = 0;
    this.skillCd = {};
    this.lockOn = false;
    this.lockTarget = null;
    this.exhausted = false;
    this.interactTarget = null;
  }

  attackDef(kind, idx) {
    const w = this.game.inventory.equippedStats().weapon;
    const anims = kind === 'light'
      ? ['light1', 'light2', 'light3']
      : ['heavy1', 'heavy2'];
    const anim = anims[Math.min(idx, anims.length - 1)];
    const clipDur = CLIP_DUR[anim];
    const heavy = kind === 'heavy';
    return {
      id: `p_${kind}${idx}`, name: anim, dmgMul: heavy ? 1.65 : 1.0, dur: clipDur / w.speed,
      hitAt: 0.52, range: w.range + 0.35, arc: heavy ? 1.3 : 1.9, anim,
      stamina: heavy ? 16 : 10, knockback: heavy ? 4 : 2, moveImpulse: heavy ? 3.2 : 2.6,
      isSkill: false, poiseDamage: heavy ? 30 : 14,
    };
  }

  tryAttack(kind) {
    if (this.state === 'attack' || this.state === 'skill') {
      // buffer / combo-cancel
      const atk = this.combat.attack;
      if (atk && atk.t / atk.def.dur > 0.6) this.buffered = kind;
      return;
    }
    if (!this.canAct()) return;
    const cost = (kind === 'heavy' ? 16 : 10) * (1 + this.game.progression.p().staminaCostMul);
    if (this.stamina < 5) { this.exhausted = true; return; }
    if (this.comboKind === kind && this.comboIdx < this.game.inventory.equippedStats().weapon.combo - 1) this.comboIdx++;
    else this.comboIdx = 0;
    this.comboKind = kind;
    this.spendStamina(cost);
    this.state = 'attack';
    this.combat.blocking = false;
    const def = this.attackDef(kind, this.comboIdx);
    // face camera forward when free, or lock target
    if (this.lockTarget && !this.lockTarget.combat.dead) this.faceToward(this.lockTarget.pos.x, this.lockTarget.pos.z, 0.016, 40);
    else if (!this.moving) this.faceDir(this.game.cameraRig.flatForward().x, this.game.cameraRig.flatForward().z, 0.016, 40);
    this.startAttack(def);
    if (this._trail) this._trail.setColor(kind === 'heavy' ? 0xffd8a8 : 0xbfd8ff);
    this.game.audio.sfx(def.name.startsWith('heavy') ? 'swingHeavy' : 'swing');
  }

  tryDodge(inputDir) {
    if (!this.canAct() || this.dodgeCd > 0 || this.dodgeCount >= 2) return;
    const cost = 22 * (1 + this.game.progression.p().staminaCostMul);
    if (this.stamina < 8) { this.exhausted = true; return; }
    this.spendStamina(cost);
    this.state = 'dodge';
    this.combat.blocking = false;
    this.anim.play('dodge', { restart: true, blend: 0.02 });
    // roll direction: input dir if any, else backward
    let dx = inputDir.x, dz = inputDir.z;
    if (dx === 0 && dz === 0) { dx = -Math.sin(this.yaw); dz = -Math.cos(this.yaw); }
    const want = Math.atan2(dx, dz);
    this.yaw = want;
    this.vel.x = Math.sin(want) * 11;
    this.vel.z = Math.cos(want) * 11;
    this.combat.iframes = 0.34 + this.game.progression.p().dodgeIframes;
    this.dodgeCd = 0.45;
    this.dodgeCount++;
    this.dodgeT = 0.5;
    this.game.audio.sfx('dodge');
  }

  trySkill() {
    if (this.state === 'attack' || !this.canAct()) return;
    const active = this.game.progression.activeSkill();
    if (!active) { this.game.ui.notify('info', 'Chưa học kỹ năng nào (nhấn T)'); return; }
    const def = PLAYER_SKILLS[active.skill];
    if (this.skillCd[active.skill] > 0) return;
    if (this.stamina < def.stamina) { this.exhausted = true; return; }
    this.spendStamina(def.stamina);
    this.skillCd[active.skill] = active.cooldown;
    this.state = 'skill';
    this.combat.blocking = false;
    this.startAttack({ ...def, id: 'skill_' + active.skill }, { isSkill: true });
    if (this._trail) this._trail.setColor(active.skill === 'iai' ? 0x7ae0ff : active.skill === 'whirlwind' ? 0xaef0ff : 0xc8a0ff);
    if (def.buff) this.addBuff('nextHitPct', def.buff.nextHitPct, def.buff.duration);
    if (def.selfBuff) {
      this.addBuff('defensePct', def.selfBuff.defensePct, def.selfBuff.duration);
      if (def.selfBuff.noStagger) this.addBuff('noStagger', 1, def.selfBuff.duration);
      this.game.vfx.popup(this.pos, 'Thân Bất Hoại!', '#c8a0ff', true);
    }
    if (def.anim === 'skill_iai' || def.anim === 'skill_dash') this.game.audio.sfx('swingHeavy');
  }

  toggleLock() {
    if (this.lockOn) {
      this.lockOn = false; this.lockTarget = null;
      this.game.cameraRig.setLockTarget(null);
      this.game.vfx.setLockMarker(null);
    } else {
      const t = this.game.combat.findLockTarget(this, null, 0);
      if (t) { this.lockOn = true; this.setLockTarget(t); }
      else this.game.ui.notify('info', 'Không có mục tiêu trong tầm khóa');
    }
  }

  setLockTarget(t) {
    this.lockTarget = t;
    this.game.cameraRig.setLockTarget(t);
    this.game.vfx.setLockMarker(t);
  }

  updateLock(dt) {
    if (!this.lockOn) return;
    if (!this.lockTarget || this.lockTarget.combat.dead || this.lockTarget.disposed) {
      const next = this.game.combat.findLockTarget(this, null, 0);
      if (next) this.setLockTarget(next);
      else { this.lockOn = false; this.setLockTarget(null); }
    }
  }

  update(dt, game) {
    if (this.combat.dead) {
      super.update(dt, game);
      if (this.combat.deadT > 1.6 && game.state === 'playing') game.onPlayerDeath();
      return;
    }

    const input = game.input;
    const prog = game.progression.p();
    this.dodgeCd = Math.max(0, this.dodgeCd - dt);
    this.dodgeT = Math.max(0, (this.dodgeT || 0) - dt);
    if (this.dodgeT <= 0) this.dodgeCount = 0;
    for (const k in this.skillCd) this.skillCd[k] = Math.max(0, this.skillCd[k] - dt);
    if (this.stamina > this.maxStamina * 0.25) this.exhausted = false;

    // toggles
    if (input.wasPressed('lockOn')) this.toggleLock();
    if (input.wasPressed('cameraToggle')) game.cameraRig.toggleMode();
    if (input.wasPressed('interact')) this.tryInteract(game);

    // dodge input
    if (input.wasPressed('dodge')) {
      const axis = input.moveAxis();
      const cam = game.cameraRig;
      const f = cam.flatForward(), r = cam.flatRight();
      this.tryDodge({ x: f.x * axis.z + r.x * axis.x, z: f.z * axis.z + r.z * axis.x });
    }
    if (input.wasPressed('lightAttack')) this.tryAttack('light');
    if (input.wasPressed('heavyAttack')) this.tryAttack('heavy');
    if (input.wasPressed('skill')) this.trySkill();

    this.updateLock(dt);

    // ---- state machine ----
    const axis = input.moveAxis();
    const cam = game.cameraRig;
    const f = cam.flatForward(), r = cam.flatRight();
    const wishX = f.x * axis.z + r.x * axis.x;
    const wishZ = f.z * axis.z + r.z * axis.x;
    this.moving = axis.len > 0;

    if (this.state === 'dodge') {
      if (this.anim.name !== 'dodge') this.state = 'move';
    } else if (this.state === 'attack' || this.state === 'skill') {
      const atk = this.combat.attack;
      if (!atk) {
        this.state = 'move';
        if (this.buffered) { const b = this.buffered; this.buffered = null; this.tryAttack(b); }
      } else {
        // slow drift while attacking
        this.moveGrounded(dt, game, wishX * 0.25, wishZ * 0.25, 2);
      }
    } else if (this.combat.staggered > 0) {
      this.state = 'move';
      this.moveGrounded(dt, game, 0, 0, 0);
    } else {
      // free movement
      const sprint = input.isDown('sprint') && this.moving && !this.exhausted && !this.combat.blocking;
      let speed = this.combat.blocking ? 2.2 : sprint ? 7.2 : this.moving ? 5.0 : 0;
      if (sprint) {
        this.spendStamina(7 * dt * (1 + prog.staminaCostMul));
        if (this.stamina <= 0) this.exhausted = true;
      }
      this.moveGrounded(dt, game, wishX, wishZ, speed * (1 + prog.moveSpeed));

      // facing: lock target or move direction
      if (this.lockOn && this.lockTarget) {
        this.faceToward(this.lockTarget.pos.x, this.lockTarget.pos.z, dt, 10);
      } else if (this.moving) {
        this.faceDir(wishX, wishZ, dt, 13);
      }

      // block
      if (input.isDown('block') && !this.combat.attack) {
        if (!this.combat.blocking) {
          this.combat.blocking = true;
          this.combat.blockPressT = 0;
          this.anim.play('block', { blend: 0.08 });
        }
      } else if (this.combat.blocking) {
        this.combat.blocking = false;
      }

      // jump
      if (input.wasPressed('jump') && this.grounded && this.canAct()) {
        this.vel.y = 6.8;
        this.grounded = false;
        this.anim.play('jump', { restart: true });
      }

      // locomotion animation
      if (!this.combat.attack && this.grounded) {
        if (this.combat.blocking) { /* block clip holds */ }
        else if (sprint) { if (this.anim.name !== 'sprint') this.anim.play('sprint'); this.moveMode = 'sprint'; }
        else if (this.moving) { if (this.anim.name !== 'run' && this.anim.name !== 'walk') this.anim.play('run'); this.moveMode = 'run'; }
        else if (this.anim.name !== 'idle' && !this.anim.current.clip.loop) { /* oneshot playing */ }
        else if (this.anim.name !== 'idle') this.anim.play('idle');
        if (!this.moving && this.anim.name === 'run') this.anim.play('idle');
        if (!this.moving && this.anim.name === 'sprint') this.anim.play('idle');
      }

      // footsteps + dust
      if (this.moving && this.grounded) {
        this.stepT -= dt * (sprint ? 2.6 : 1.6);
        if (this.stepT <= 0) {
          this.stepT = 0.4;
          game.audio.sfx('step');
          const dust = game.world.def ? game.world.def.palette.dirt : 0x9a8a6a;
          game.particles.spawn({ x: this.pos.x, y: this.pos.y + 0.08, z: this.pos.z },
            { count: sprint ? 5 : 2, color: [dust, 0xbcae94], speed: 1.3, life: 0.45, gravity: -1.5, spread: 0.35 });
        }
      }
      this.moveMode = sprint ? 'sprint' : this.moving ? 'run' : 'idle';
    }

    super.update(dt, game);
  }

  tryInteract(game) {
    const t = game.world.nearestInteractable(this.pos, 2.6);
    if (t) game.world.useInteractable(t, this);
  }

  respawn(shrine) {
    const game = this.game;
    const [x, z] = shrine || game.world.spawnPoint;
    this.respawnAt(x, z, game);
    this.state = 'move';
    this.combat.iframes = 2;
  }
}
