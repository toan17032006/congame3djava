// Combat resolution: hit detection (arc/AoE), damage pipeline hookup, projectiles, lock-on.
import * as THREE from 'three';
import { isHostile } from './factions.js';
import { makeArrow, makeFireball } from '../gfx/props.js';

export class CombatSystem {
  constructor(game) {
    this.game = game;
    this.projectiles = [];
  }

  candidatesFor(attacker) {
    // everything that can be hit, filtered by hostility at hit time
    const list = [this.game.player, ...this.game.npcs];
    return list.filter((t) => t && !t.disposed && !t.combat.dead && t !== attacker);
  }

  resolveStrike(attacker, atkState, strikeIdx) {
    const def = atkState.def;
    const game = this.game;
    const f = attacker.forward();
    const isPlayer = attacker.isPlayer;

    if (def.projectileFan) {
      const fan = def.projectileFan;
      const baseYaw = attacker.yaw;
      for (let i = 0; i < fan.count; i++) {
        const spread = fan.count > 1 ? (i / (fan.count - 1) - 0.5) * fan.spread : 0;
        const a = baseYaw + spread;
        game.spawnProjectile({
          owner: attacker,
          pos: { x: attacker.pos.x, y: attacker.pos.y + 1.4, z: attacker.pos.z },
          vel: { x: Math.sin(a) * fan.speed, y: fan.fire ? 0.4 : 0, z: Math.cos(a) * fan.speed },
          dmg: attacker.effAttack() * def.dmgMul, gravity: 0, fire: !!fan.fire, life: 3.5,
        });
      }
      game.audio.sfx(fan.fire ? 'fire' : 'arrow');
      return;
    }

    if (def.aoe) {
      game.audio.sfx('thud');
      game.cameraRig.shake(0.2);
      for (const t of this.candidatesFor(attacker)) {
        const d = Math.hypot(t.pos.x - attacker.pos.x, t.pos.z - attacker.pos.z);
        if (d <= def.range && isHostile(attacker.faction, t.faction) && !atkState.targets.has(t.id)) {
          atkState.targets.add(t.id);
          this.applyHit(attacker, t, def);
        }
      }
      game.particles.spawn({ x: attacker.pos.x, y: attacker.pos.y + 0.4, z: attacker.pos.z },
        { count: 26, color: def.fire ? [0xff5a2a, 0xffd257] : [0xc8b090, 0xffffff], speed: 7, life: 0.5, spread: def.range * 0.8, gravity: -4 });
      if (def.fire) game.audio.sfx('fire');
      return;
    }

    // melee arc
    const range = def.range;
    const cx = attacker.pos.x + f.x * range * 0.5;
    const cz = attacker.pos.z + f.z * range * 0.5;
    const halfArc = def.arc / 2;
    let hitAny = false;
    for (const t of this.candidatesFor(attacker)) {
      if (atkState.targets.has(t.id)) continue;
      const dx = t.pos.x - attacker.pos.x, dz = t.pos.z - attacker.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > range + t.radius) continue;
      if (Math.abs((t.pos.y + 1.0) - (attacker.pos.y + 1.0)) > 2.4) continue;
      const dot = (dx / (d || 1)) * f.x + (dz / (d || 1)) * f.z;
      const ang = Math.acos(Math.max(-1, Math.min(1, dot)));
      if (ang > halfArc + Math.atan2(t.radius, Math.max(d, 0.5))) continue;
      if (!isHostile(attacker.faction, t.faction)) continue;
      atkState.targets.add(t.id);
      this.applyHit(attacker, t, def);
      hitAny = true;
    }
    // whiff/feedback
    game.vfx.slashArc(attacker.pos, attacker.yaw, range, isPlayer ? (def.isSkill ? 0xaee6ff : 0xffe8c0) : 0xff9a7a);
  }

  applyHit(attacker, target, def) {
    const game = this.game;
    let dmg = attacker.effAttack() * def.dmgMul;
    // riposte bonus
    if (attacker.riposte > 0) {
      dmg *= 2;
      attacker.riposte = 0;
      game.vfx.popup(attacker.pos, 'Phản công!', '#7ae0ff', true);
    }
    // windstep/nextHit buff
    const nh = attacker.buffAmount('nextHitPct');
    if (nh > 0) { dmg *= 1 + nh; attacker.buffs = attacker.buffs.filter((b) => b.stat !== 'nextHitPct'); }
    // crit (player only)
    let crit = false;
    if (attacker.isPlayer) {
      const w = game.inventory.equippedStats().weapon;
      const critChance = 5 + game.progression.attrs.agi * 0.5 + w.crit + game.progression.p().crit;
      crit = Math.random() * 100 < critChance;
    }
    const res = target.takeDamage(dmg, {
      from: attacker, knockback: def.knockback || 2,
      guardBreak: !!def.guardBreak, crit,
      poiseDamage: def.poiseDamage || (dmg * 0.4),
      staminaCost: def.stamina || 10,
    });
    if (res.result === 'hit' || res.result === 'guardbreak') {
      game.audio.sfx(def.dmgMul >= 1.4 ? 'hitHeavy' : 'hit');
      game.engine.hitstop(crit ? 0.09 : def.dmgMul >= 1.4 ? 0.07 : 0.045);
      if (attacker.isPlayer) game.cameraRig.shake(0.12);
    }
    return res;
  }

  onNpcKilled(npc) {
    const game = this.game;
    if (npc.faction === 'samurai_ally') {
      game.ui.notify('info', 'Một đồng minh đã ngã...');
      return;
    }
    if (npc.faction === 'villager') {
      game.ui.notify('bad', 'Một dân làng đã chết!');
      return;
    }
    const def = npc.def;
    const scale = npc.levelScale || 1;
    const xp = Math.round((def.xp || 0) * scale);
    const coins = Math.round((def.coins || 0) * scale);
    if (xp > 0) game.progression.grantXp(xp);
    if (coins > 0) {
      game.inventory.addCoins(coins);
      game.ui.notify('gold', `+${coins} vàng`);
    }
    for (const l of def.loot || []) {
      if (Math.random() < l.chance) {
        const qty = (l.qty || 1) + (Math.random() < 0.2 ? 1 : 0);
        game.world.addInteractable({ type: 'pickup', x: npc.pos.x + (Math.random() - 0.5) * 1.6, z: npc.pos.z + (Math.random() - 0.5) * 1.6, item: l.id, qty });
      }
    }
    if (!npc.isBoss) game.quests.onEvent('kill', { enemy: npc.enemyId });
    game.levelManager.onKill(npc);
    if (npc.isBoss) game.ui.hud.setBoss(null);
  }

  // ---- projectiles --------------------------------------------------------
  spawnProjectile(opts) {
    const mesh = opts.fire ? makeFireball() : makeArrow();
    mesh.position.set(opts.pos.x, opts.pos.y, opts.pos.z);
    this.game.engine.scene.add(mesh);
    const p = { mesh, pos: new THREE.Vector3(opts.pos.x, opts.pos.y, opts.pos.z), vel: new THREE.Vector3(opts.vel.x, opts.vel.y, opts.vel.z),
      dmg: opts.dmg, owner: opts.owner, gravity: opts.gravity ?? 0, life: opts.life || 3, fire: !!opts.fire };
    this.projectiles.push(p);
  }

  updateProjectiles(dt) {
    const game = this.game;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.vel.y += p.gravity * dt;
      p.pos.addScaledVector(p.vel, dt);
      p.mesh.position.copy(p.pos);
      // orient arrow
      if (!p.fire) {
        p.mesh.lookAt(p.pos.x + p.vel.x, p.pos.y + p.vel.y, p.pos.z + p.vel.z);
      }
      if (p.fire && Math.random() < 0.6) {
        game.particles.spawn(p.pos, { count: 1, color: [0xff6a2a, 0xffd257], speed: 0.6, life: 0.3, gravity: 0.5, spread: 0.1 });
      }
      let hit = false;
      // targets hostile to owner
      const targets = [game.player, ...game.npcs].filter((t) => t && !t.disposed && !t.combat.dead && isHostile(p.owner.faction, t.faction));
      for (const t of targets) {
        const dx = t.pos.x - p.pos.x, dy = (t.pos.y + 1.1) - p.pos.y, dz = t.pos.z - p.pos.z;
        if (dx * dx + dy * dy + dz * dz < 0.65) {
          if (t === game.player && t.combat.iframes > 0) continue;
          t.takeDamage(p.dmg, { from: p.owner, knockback: 2, projectile: true, staminaCost: 8 });
          game.audio.sfx('hit');
          hit = true;
          break;
        }
      }
      if (p.pos.y < game.world.groundAt(p.pos.x, p.pos.z) + 0.05) hit = true;
      if (hit || p.life <= 0) {
        game.engine.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  clearProjectiles() {
    for (const p of this.projectiles) this.game.engine.scene.remove(p.mesh);
    this.projectiles = [];
  }

  // ---- lock on ------------------------------------------------------------
  findLockTarget(player, current, dirHint) {
    const game = this.game;
    const cam = game.cameraRig;
    let best = null, bestScore = Infinity;
    for (const n of game.npcs) {
      if (n.disposed || n.combat.dead || !isHostile('player', n.faction)) continue;
      const dx = n.pos.x - player.pos.x, dz = n.pos.z - player.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 24) continue;
      const toYaw = Math.atan2(dx, dz);
      const rel = Math.abs(((toYaw - cam.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      const score = d + rel * 10 + (n.isBoss ? -8 : 0);
      if (score < bestScore) { best = n; bestScore = score; }
    }
    return best;
  }
}
