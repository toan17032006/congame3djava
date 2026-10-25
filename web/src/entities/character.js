// Character base: stats, movement physics, combat state, damage pipeline, death.
import * as THREE from 'three';
import { Entity } from './entity.js';
import { Animator } from '../gfx/animator.js';
import { CLIPS } from '../gfx/clips.js';
import { buildHumanoid } from '../gfx/humanoid.js';
import { angleWrap, clamp } from '../core/utils.js';
import { Trail } from '../gfx/trail.js';

const GRAVITY = -18;

export class Character extends Entity {
  constructor(game, cfg) {
    super(cfg.x || 0, cfg.y || 0, cfg.z || 0);
    this.game = game;
    this.name = cfg.name || '???';
    this.faction = cfg.faction || 'enemy';
    this.stats = cfg.stats;             // {maxHp, attack, defense, speed, poise}
    this.hp = this.stats.maxHp;
    this.stamina = cfg.maxStamina || 100;
    this.maxStamina = cfg.maxStamina || 100;
    this.staminaRegenDelay = 0;
    this.radius = 0.45 * (cfg.scale || 1);
    this.scale = cfg.scale || 1;
    this.isPlayer = !!cfg.isPlayer;
    this.ghost = !!cfg.ghost;
    this.buffs = [];                    // {stat, amount, until}
    this.riposte = 0;                   // riposte window timer (dmg x2)
    this.hitFlash = 0;

    this.rig = buildHumanoid({
      colors: cfg.colors, ghost: this.ghost, scale: cfg.scale || 1,
      weapon: cfg.weaponModel || null, armor: cfg.armorModel || null, helmet: cfg.helmetModel || null,
    });
    game.engine.scene.add(this.rig.group);
    this.anim = new Animator(this.rig, CLIPS);
    this.anim.play('idle');

    this.combat = {
      blocking: false, blockPressT: 99, parried: 0,
      attack: null,          // {def, t, strikesFired, targets:Set, isSkill}
      iframes: 0, staggered: 0, staggerKind: null, dead: false, deadT: 0,
      hitIds: new Set(),     // damage instance guard (one swing = one hit per target)
    };
    this.grounded = true;
    this.airTime = 0;
    this.lastStrikeId = 0;
    // weapon trail only for the hero and bosses (perf)
    this._trail = null;
    if (this.isPlayer || cfg.isBoss) {
      this._trail = new Trail(game.engine.scene, cfg.trailColor ?? (this.isPlayer ? 0xbfd8ff : 0x9fb0e8));
    }
  }

  dispose(game) {
    if (this._trail) { this._trail.dispose(); this._trail = null; }
    super.dispose(game);
  }

  // additive motion layered on top of the clip: breathing + head look-at
  _animOverlay(dt) {
    if (this.combat.dead) return;
    const J = this.rig.joints;
    const name = this.anim.name;
    const t = this.game.time;
    if (name === 'idle' || name === 'block' || name === 'walk') {
      J.torso.rotation.x += Math.sin(t * 1.8 + this.id) * 0.014;
      J.head.rotation.z += Math.sin(t * 0.6 + this.id * 2) * 0.02;
      J.armL_sh.rotation.z += Math.sin(t * 1.8 + this.id) * 0.012;
    } else if (name === 'run' || name === 'sprint') {
      J.torso.rotation.z += Math.sin(t * 9 + this.id) * 0.02;
    }
    // head tracks the lock/aggro target
    const tgt = this.isPlayer ? this.lockTarget : (this.aggro ? this.target : null);
    if (tgt && !tgt.combat.dead && !this.combat.attack && this.combat.staggered <= 0) {
      const dx = tgt.pos.x - this.pos.x, dz = tgt.pos.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 30) {
        const wantYaw = Math.atan2(dx, dz);
        const rel = angleWrap(wantYaw - this.yaw);
        const dy = (tgt.pos.y + 1.4) - (this.pos.y + 1.55);
        const wantPitch = Math.atan2(dy, d);
        J.head.rotation.y += clamp(rel, -0.7, 0.7) * 0.55;
        J.head.rotation.x -= clamp(wantPitch, -0.35, 0.45) * 0.4;
      }
    }
  }

  _updateTrail(dt) {
    if (!this._trail) return;
    const atk = this.combat.attack;
    const active = !!atk && atk.t / atk.def.dur > 0.12 && atk.t / atk.def.dur < 0.85;
    this._trail.update(active, this.rig, dt);
  }

  get maxHp() { return this.stats.maxHp; }

  forward() { return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }; }

  hasBuff(stat) { return this.buffs.some((b) => b.stat === stat && b.until > 0); }
  buffAmount(stat) {
    let v = 0;
    for (const b of this.buffs) if (b.stat === stat) v += b.amount;
    return v;
  }
  addBuff(stat, amount, duration) {
    const existing = this.buffs.find((b) => b.stat === stat);
    if (existing) { existing.amount = Math.max(existing.amount, amount); existing.until = Math.max(existing.until, this.game.time + duration); }
    else this.buffs.push({ stat, amount, until: this.game.time + duration });
  }
  updateBuffs() {
    this.buffs = this.buffs.filter((b) => b.until > this.game.time || b.until < 0);
  }

  effAttack() {
    let a = this.stats.attack + this.buffAmount('attackFlat');
    a *= 1 + this.buffAmount('attackPct');
    if (this.hasBuff('lowHpAttack') && this.hp / this.maxHp < 0.3) a *= 1 + this.buffAmount('lowHpAttack');
    return a;
  }
  effDefense() {
    let d = this.stats.defense + this.buffAmount('defense');
    d *= 1 + this.buffAmount('defensePct');
    return d;
  }
  spendStamina(n) {
    if (this.isPlayer) {
      this.stamina = Math.max(0, this.stamina - n);
      this.staminaRegenDelay = 0.6;
    }
  }
  restoreStamina(n) { if (this.isPlayer) this.stamina = Math.min(this.maxStamina, this.stamina + n); }

  // ---- movement -----------------------------------------------------------
  moveGrounded(dt, game, wishX, wishZ, speed) {
    const accel = 26;
    this.vel.x += (wishX * speed - this.vel.x) * Math.min(accel * dt / Math.max(speed, 0.1), 1);
    this.vel.z += (wishZ * speed - this.vel.z) * Math.min(accel * dt / Math.max(speed, 0.1), 1);
    if (wishX === 0 && wishZ === 0) {
      const dampF = Math.max(0, 1 - dt * 12);
      this.vel.x *= dampF; this.vel.z *= dampF;
    }
  }

  applyPhysics(dt, game) {
    // gravity & ground
    const ground = game.world.groundAt(this.pos.x, this.pos.z);
    if (this.grounded && this.pos.y <= ground + 0.02) this.pos.y = ground;
    this.vel.y += GRAVITY * dt;
    this.pos.y += this.vel.y * dt;
    if (this.pos.y <= ground) {
      if (!this.grounded && this.vel.y < -6) {
        this.anim.play('land', { restart: true });
        if (this.isPlayer) {
          game.cameraRig.shake(0.12);
          game.particles.spawn({ x: this.pos.x, y: this.pos.y + 0.1, z: this.pos.z },
            { count: 10, color: [0xb0a48a, 0x8a8070], speed: 2.2, life: 0.5, gravity: -3, spread: 0.7 });
        }
      }
      this.pos.y = ground; this.vel.y = 0; this.grounded = true;
    } else this.grounded = false;

    // horizontal
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    // obstacles & bounds
    game.world.collideCircle(this.pos, this.radius);
    const lim = game.world.def.size / 2 - 2;
    this.pos.x = clamp(this.pos.x, -lim, lim);
    this.pos.z = clamp(this.pos.z, -lim, lim);
  }

  faceToward(x, z, dt, rate = 12) {
    const want = Math.atan2(x - this.pos.x, z - this.pos.z);
    this.yaw += angleWrap(want - this.yaw) * (1 - Math.exp(-rate * dt));
  }

  faceDir(dx, dz, dt, rate = 14) {
    if (dx === 0 && dz === 0) return;
    const want = Math.atan2(dx, dz);
    this.yaw += angleWrap(want - this.yaw) * (1 - Math.exp(-rate * dt));
  }

  // ---- attacks ------------------------------------------------------------
  canAct() { return !this.combat.dead && this.combat.staggered <= 0 && !this.combat.attack && this.combat.parried <= 0; }

  startAttack(atkDef, opts = {}) {
    if (!this.canAct()) return false;
    const clip = CLIPS[atkDef.anim] || CLIPS.light1;
    const speed = clip.dur / atkDef.dur;
    this.anim.play(atkDef.anim, { speed, restart: true, blend: 0.04 });
    this.lastStrikeId++;
    this.combat.attack = {
      def: atkDef, t: 0, clipDur: clip.dur, strikesFired: 0,
      targets: new Set(), isSkill: !!opts.isSkill, move: opts.move || null,
    };
    if (atkDef.moveImpulse && !opts.noMove) {
      const f = this.forward();
      this.vel.x = f.x * atkDef.moveImpulse;
      this.vel.z = f.z * atkDef.moveImpulse;
    }
    return true;
  }

  updateAttack(dt, game) {
    const atk = this.combat.attack;
    if (!atk) return;
    atk.t += dt * (atk.def.dur / atk.clipDur) * (1 / (atk.def.dur / atk.clipDur)); // t advances in real seconds
    const norm = atk.t / atk.def.dur;
    const hitAts = Array.isArray(atk.def.hitAt) ? atk.def.hitAt : [atk.def.hitAt];
    while (atk.strikesFired < hitAts.length && norm >= hitAts[atk.strikesFired]) {
      game.combat.resolveStrike(this, atk, atk.strikesFired);
      atk.strikesFired++;
    }
    if (atk.t >= atk.def.dur) this.combat.attack = null;
  }

  // ---- damage -------------------------------------------------------------
  takeDamage(amount, opts = {}) {
    if (this.combat.dead) return { result: 'dead' };
    if (this.combat.iframes > 0 && !opts.pure) return { result: 'iframes' };
    const c = this.combat;
    const from = opts.from;
    const toAttacker = from ? Math.atan2(from.pos.x - this.pos.x, from.pos.z - this.pos.z) : this.yaw;
    const facingAttacker = Math.abs(angleWrap(toAttacker - this.yaw)) < 1.7;

    // PARRY: pressed block recently & facing & parryable
    if (c.blocking && facingAttacker && c.blockPressT < this.parryWindow() && !opts.guardBreak && !opts.projectile) {
      this.onParry(from, opts);
      return { result: 'parried' };
    }
    // BLOCK: chip damage + stamina cost
    if (c.blocking && facingAttacker && !opts.guardBreak) {
      const cost = (opts.staminaCost || 12) * 1.4;
      this.spendStamina(cost);
      if (this.isPlayer && this.stamina <= 0) {
        c.blocking = false;
        this.enterStagger('guardbreak');
        this.game.audio.sfx('clang');
        return { result: 'guardbreak' };
      }
      amount *= 0.15;
      this.game.audio.sfx('block');
      this.game.vfx.popup(this.pos, 'Chặn', '#9ab0c8');
      if (!this.combat.attack) this.anim.play('blockHit', { blend: 0.05, restart: true });
      this.game.particles.spawn({ x: this.pos.x + Math.sin(this.yaw) * 0.6, y: this.pos.y + 1.1, z: this.pos.z + Math.cos(this.yaw) * 0.6 },
        { count: 10, color: [0xfff0c0, 0xbfd8ff, 0xffffff], speed: 5, life: 0.3, spread: 0.35, gravity: -6 });
    }

    if (this.hasBuff('noStagger')) { /* ironwill: no reaction */ }
    const def = this.effDefense();
    let dmg = amount * (100 / (100 + def));
    const crit = opts.crit || false;
    if (crit) dmg *= 1.6;
    dmg = Math.max(1, Math.round(dmg));
    this.hp -= dmg;

    // reactions
    if (this.hasBuff('noStagger') || this.hp <= 0) {
      // no stagger on lethal/dead
    } else {
      const poiseHit = (opts.poiseDamage || dmg) * (opts.projectile ? 0.5 : 1);
      this._poise = (this._poise || 0) + poiseHit;
      if (this._poise >= this.stats.poise) {
        this._poise = 0;
        this.enterStagger(c.blocking ? 'guardbreak' : 'stagger', opts);
      } else if (!c.blocking && !c.attack) {
        this.anim.play('hit', { restart: true });
      } else if (c.attack && !this.isPlayer && !opts.projectile) {
        // attacking through light hits (poise)
      }
    }

    this.hitFlash = 0.15;
    this.game.vfx.popup(this.pos, String(dmg), crit ? '#ffd257' : (this.isPlayer ? '#ff6a5a' : '#ffffff'), crit);
    const hitPos = { x: this.pos.x, y: this.pos.y + 1.2, z: this.pos.z };
    this.game.particles.spawn(hitPos, { count: crit ? 16 : 9, color: crit ? [0xffd257, 0xff8a3a, 0xffffff] : [0xff5a4a, 0xc03a2a, 0xffffff], speed: crit ? 6 : 4, life: 0.35, spread: 0.5, dir: from ? { x: (this.pos.x - from.pos.x), y: 0.3, z: (this.pos.z - from.pos.z) } : null });
    if (opts.knockback && from) {
      const kb = opts.knockback * (this.scale > 1.2 ? 0.4 : 1);
      const dx = this.pos.x - from.pos.x, dz = this.pos.z - from.pos.z;
      const l = Math.hypot(dx, dz) || 1;
      this.vel.x += (dx / l) * kb * 2.4;
      this.vel.z += (dz / l) * kb * 2.4;
    }
    if (this.hp <= 0) { this.die(); return { result: 'killed', dmg }; }
    if (this.isPlayer) {
      this.game.cameraRig.shake(0.25);
      this.game.ui.hud.flashHp();
    }
    return { result: 'hit', dmg };
  }

  parryWindow() { return this.isPlayer ? 0.22 + this.game.progression.p().parryWindow : 0.18; }

  onParry(from, opts) {
    this.game.audio.sfx('parry');
    this.restoreStamina(20);
    this.riposte = 1.5;
    this.anim.play('parry', { restart: true, blend: 0.03 });
    this.game.vfx.popup(this.pos, 'PARRY!', '#7ae0ff', true);
    const px = this.pos.x + Math.sin(this.yaw) * 0.7, pz = this.pos.z + Math.cos(this.yaw) * 0.7;
    this.game.particles.spawn({ x: px, y: this.pos.y + 1.2, z: pz }, { count: 18, color: [0x7ae0ff, 0xffffff, 0xffd257], speed: 7, life: 0.4, spread: 0.3 });
    if (this.isPlayer) this.game.cameraRig.shake(0.15);
    if (from && from.enterParried) from.enterParried();
  }

  enterParried() {
    this.combat.attack = null;
    this.combat.parried = 1.4;
    this.anim.play('parried', { restart: true });
    this.game.vfx.popup(this.pos, 'Mất thăng bằng', '#7ae0ff');
  }

  enterStagger(kind, opts = {}) {
    if (this.combat.dead) return;
    this.combat.attack = null;
    this.combat.blocking = false;
    this.combat.staggered = kind === 'guardbreak' ? 1.3 : 0.55;
    this.combat.staggerKind = kind;
    this.anim.play(kind, { restart: true });
    if (kind === 'guardbreak') this.game.vfx.popup(this.pos, 'Phá thế!', '#ffb057');
  }

  heal(n) {
    if (this.combat.dead) return;
    this.hp = Math.min(this.maxHp, this.hp + n);
    this.game.particles.spawn({ x: this.pos.x, y: this.pos.y + 1, z: this.pos.z }, { count: 10, color: [0x6fe08a, 0xaef0c0], speed: 1.5, life: 0.6, gravity: 1.5, spread: 0.6 });
  }

  die() {
    if (this.combat.dead) return;
    this.combat.dead = true;
    this.combat.deadT = 0;
    this.combat.attack = null;
    this.combat.blocking = false;
    this.hp = 0;
    this.anim.play('dead', { restart: true, blend: 0.08 });
    this.game.audio.sfx('death');
    this.vel.x = 0; this.vel.z = 0;
  }

  respawnAt(x, z, game) {
    this.combat.dead = false;
    this.combat.staggered = 0;
    this.combat.parried = 0;
    this.combat.iframes = 1;
    this._poise = 0;
    this.hp = this.maxHp;
    this.stamina = this.maxStamina;
    this.pos.set(x, game.world.groundAt(x, z), z);
    this.vel.set(0, 0, 0);
    this.anim.play('idle', { restart: true });
  }

  update(dt, game) {
    const c = this.combat;
    c.iframes = Math.max(0, c.iframes - dt);
    c.parried = Math.max(0, c.parried - dt);
    if (c.staggered > 0) {
      c.staggered -= dt;
      if (c.staggered <= 0) { c.staggerKind = null; if (!c.dead) this.anim.play('idle'); }
    }
    if (c.dead) {
      c.deadT += dt;
      // corpse fade handled by npc; base char just stays
    }
    if (c.blocking) c.blockPressT += dt;
    this.riposte = Math.max(0, this.riposte - dt);
    this.updateBuffs();
    this.updateAttack(dt, game);
    this.applyPhysics(dt, game);
    // stamina regen
    if (this.isPlayer && !c.dead) {
      this.staminaRegenDelay -= dt;
      if (this.staminaRegenDelay <= 0) this.stamina = Math.min(this.maxStamina, this.stamina + (14 + this.game.progression.p().staminaRegen * 10) * dt);
    }
    // hit flash tint
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      const on = this.hitFlash > 0;
      this.rig.mats.cloth.emissive.setHex(on ? 0x661111 : (this.ghost ? 0x000000 : 0x000000));
      this.rig.mats.skin.emissive.setHex(on ? 0x661111 : 0x000000);
      if (this.ghost && !on) this.rig.mats.cloth.emissive.copy(new THREE.Color(this.rig.mats.cloth.color).multiplyScalar(0.25));
    }
    this.anim.update(dt);
    this._animOverlay(dt);
    this._updateTrail(dt);
    this.syncRig();
  }
}
