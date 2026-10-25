// NPC: FSM AI (idle/patrol/chase/attack/strafe/block/dodge/retreat/flee), allies & villagers.
import { Character } from './character.js';
import { ENEMIES, NPC_ATTACKS } from '../data/enemies.js';
import { isHostile } from '../systems/factions.js';

export const EXTRA_DEFS = {
  ally_samurai: { id: 'ally_samurai', name: 'Samurai đồng minh', tier: 3,
    hp: 90, attack: 16, defense: 8, speed: 4.9, poise: 30, xp: 0, coins: 0,
    weapon: { style: 'katana', len: 1.1, color: 0xc8ccd4 }, colors: { cloth: 0x2a4a6a, skin: 0xc9a284, hair: 0x14100c, accent: 0x4a7aba },
    scale: 1.02, faction: 'samurai_ally',
    ai: { sight: 34, attackRange: 2.3, cooldown: 1.5, blockChance: 0.35, dodgeChance: 0.2, strafeChance: 0.4, assistRadius: 0, moves: ['e_light', 'e_combo2', 'e_overhead'] },
    loot: [] },
  villager: { id: 'villager', name: 'Dân làng', tier: 0,
    hp: 30, attack: 4, defense: 1, speed: 3.4, poise: 8, xp: 0, coins: 0,
    weapon: null, colors: { cloth: 0x8a7a5a, skin: 0xc9a284, hair: 0x241a12, accent: 0x6a5a3a },
    scale: 0.97, faction: 'villager',
    ai: { sight: 20, attackRange: 1.5, cooldown: 3, blockChance: 0, dodgeChance: 0, strafeChance: 0, assistRadius: 0, moves: ['e_light'] },
    loot: [] },
};

export function enemyDef(id) { return ENEMIES[id] || EXTRA_DEFS[id]; }

export class Npc extends Character {
  constructor(game, { enemyId, x, z, squad = null, levelScale = 1, bossDef = null }) {
    const def = bossDef || enemyDef(enemyId);
    const scaleHp = enemyId === 'ally_samurai' || enemyId === 'villager' ? 1 : levelScale;
    super(game, {
      x, y: game.world ? game.world.groundAt(x, z) : 0, z,
      name: def.name, faction: def.faction || (bossDef ? 'bandit' : factionOf(enemyId)),
      isBoss: !!bossDef, trailColor: bossDef ? (bossDef.fire ? 0xff9a50 : bossDef.ghost ? 0x9a8aff : 0xffb08a) : undefined,
      stats: { maxHp: Math.round(def.hp * scaleHp), attack: Math.round(def.attack * Math.sqrt(levelScale)), defense: def.defense, speed: def.speed, poise: def.poise },
      colors: def.colors, scale: def.scale || 1, ghost: def.ghost,
      weaponModel: def.weapon || null,
    });
    this.enemyId = enemyId;
    this.def = def;
    this.levelScale = levelScale;
    this.squadId = squad;
    this.ai = def.ai;
    this.home = { x, z };
    this.target = null;
    this.aggro = false;
    this.state = 'patrol';
    this.decideT = Math.random() * 0.4;
    this.wanderT = 0;
    this.wanderGoal = null;
    this.attackCd = 0;
    this.rangedCd = 0;
    this.stateT = 0;
    this.blockT = 0;
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.currentMove = null;
    this.fadeT = 0;
    this.isBoss = false;
    this.alive = true;
  }

  perception(game) {
    const cands = [game.player, ...game.npcs];
    let best = null, bestD = Infinity;
    const sight = this.ai.sight;
    for (const c of cands) {
      if (!c || c === this || c.combat.dead || c.disposed) continue;
      const provocation = this.faction === 'ronin' ? (this.aggro || c === game.player && this.distTo(c) < 6.5) : true;
      if (!provocation) continue;
      if (!isHostile(this.faction, c.faction)) continue;
      const d = this.distTo(c);
      if (d < sight && d < bestD) { best = c; bestD = d; }
    }
    return best;
  }

  distTo(c) { return Math.hypot(c.pos.x - this.pos.x, c.pos.z - this.pos.z); }

  update(dt, game) {
    if (this.disposed) return;
    const c = this.combat;
    if (c.dead) {
      this.fadeT += dt;
      if (this.fadeT > 5) {
        game.removeNpc(this);
        return;
      }
      if (this.fadeT > 3.6) {
        const o = Math.max(0, 1 - (this.fadeT - 3.6) / 1.4);
        this.rig.mats.cloth.transparent = true; this.rig.mats.cloth.opacity = o;
        this.rig.mats.skin.opacity = o; this.rig.mats.skin.transparent = true;
        this.rig.mats.accent.opacity = o; this.rig.mats.accent.transparent = true;
      }
      super.update(dt, game);
      return;
    }

    const player = game.player;
    const distPlayer = this.distTo(player);
    // simulation LOD: far NPCs idle only
    if (distPlayer > 80) {
      if (this.anim.name !== 'idle') this.anim.play('idle');
      super.update(dt, game);
      return;
    }

    this.decideT -= dt; this.attackCd -= dt; this.rangedCd -= dt; this.stateT -= dt;
    this.blockT = Math.max(0, this.blockT - dt);
    if (this.blockT <= 0 && c.blocking && this.state !== 'block') c.blocking = false;

    if (this.decideT <= 0 && !c.attack) {
      this.decideT = 0.25 + Math.random() * 0.2;
      const target = this.perception(game);
      if (target) {
        if (!this.aggro) this.onAggro(game, target);
        this.target = target;
      } else if (this.aggro && distPlayer > this.ai.sight * 1.6) {
        this.aggro = false; this.target = null; this.state = 'patrol';
      } else if (!target) this.target = null;

      this.decide(game, distPlayer);
    }

    this.act(dt, game);
    super.update(dt, game);
  }

  onAggro(game, target) {
    this.aggro = true;
    this.game.audio.sfx('ui');
    // squad assist
    if (this.ai.assistRadius > 0 && this.squadId) {
      for (const n of game.npcs) {
        if (n !== this && n.squadId === this.squadId && !n.combat.dead && n.distTo(this) < this.ai.assistRadius) {
          n.aggro = true;
          n.target = target;
        }
      }
    }
  }

  decide(game, distPlayer) {
    const t = this.target;
    if (this.faction === 'villager') {
      // flee from nearby hostiles
      if (t && this.distTo(t) < 10) { this.state = 'flee'; this.stateT = 1.0; return; }
      this.state = 'idle'; return;
    }
    if (!t) {
      if (this.state !== 'patrol' && this.state !== 'idle') this.state = 'patrol';
      return;
    }
    const d = this.distTo(t);
    const isRanged = this.def.ranged;
    if (isRanged) {
      if (d < 5.5) { this.state = 'retreat'; this.stateT = 0.8; }
      else if (d > this.def.ranged.range * 0.85) { this.state = 'chase'; }
      else this.state = 'strafe';
      return;
    }
    if (this.def.ai.retreatAt && this.hp / this.maxHp < this.def.ai.retreatAt && this.state !== 'retreat' && Math.random() < 0.5) {
      this.state = 'retreat'; this.stateT = 0.9; return;
    }
    if (d > this.ai.attackRange * 1.1) { this.state = 'chase'; return; }
    // in range: choose action
    const r = Math.random();
    if (this.attackCd <= 0 && r < 0.62) { this.state = 'attack'; return; }
    if (r < 0.62 + this.ai.strafeChance * 0.4) { this.state = 'strafe'; this.stateT = 0.5 + Math.random() * 0.7; this.strafeDir = Math.random() < 0.5 ? 1 : -1; return; }
    if (r < 0.9 && this.ai.blockChance > 0 && Math.random() < this.ai.blockChance) { this.state = 'block'; this.stateT = 0.9; return; }
    this.state = 'chase';
  }

  act(dt, game) {
    const t = this.target;
    const c = this.combat;
    if (c.attack || c.staggered > 0 || c.parried > 0) { this.moveGrounded(dt, game, 0, 0, 0); return; }

    switch (this.state) {
      case 'idle': {
        this.moveGrounded(dt, game, 0, 0, 0);
        if (this.anim.name !== 'idle') this.anim.play('idle');
        break;
      }
      case 'patrol': {
        this.wanderT -= dt;
        if (!this.wanderGoal || this.wanderT <= 0) {
          this.wanderT = 2 + Math.random() * 3;
          const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 6;
          this.wanderGoal = { x: this.home.x + Math.cos(a) * r, z: this.home.z + Math.sin(a) * r };
        }
        const dx = this.wanderGoal.x - this.pos.x, dz = this.wanderGoal.z - this.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.5) {
          this.moveGrounded(dt, game, dx / d, dz / d, this.def.speed * 0.4);
          this.faceDir(dx, dz, dt, 8);
          if (this.anim.name !== 'walk') this.anim.play('walk');
        } else {
          this.moveGrounded(dt, game, 0, 0, 0);
          if (this.anim.name !== 'idle') this.anim.play('idle');
        }
        break;
      }
      case 'flee': {
        if (t) {
          const dx = this.pos.x - t.pos.x, dz = this.pos.z - t.pos.z;
          const d = Math.hypot(dx, dz) || 1;
          this.moveGrounded(dt, game, dx / d, dz / d, this.def.speed);
          this.faceDir(dx, dz, dt, 10);
          if (this.anim.name !== 'run') this.anim.play('run');
        }
        if (this.stateT <= 0) this.state = 'patrol';
        break;
      }
      case 'chase': {
        if (!t) { this.state = 'patrol'; break; }
        const dx = t.pos.x - this.pos.x, dz = t.pos.z - this.pos.z;
        const d = Math.hypot(dx, dz) || 1;
        this.moveGrounded(dt, game, dx / d, dz / d, this.def.speed);
        this.faceDir(dx, dz, dt, 12);
        if (this.anim.name !== 'run') this.anim.play('run');
        break;
      }
      case 'strafe': {
        if (!t) { this.state = 'patrol'; break; }
        const dx = t.pos.x - this.pos.x, dz = t.pos.z - this.pos.z;
        const d = Math.hypot(dx, dz) || 1;
        const px = -dz / d * this.strafeDir, pz = dx / d * this.strafeDir;
        const band = this.def.ranged ? this.def.ranged.range * 0.7 : this.ai.attackRange * 1.4;
        const toward = d > band ? 0.7 : d < band * 0.6 ? -0.6 : 0;
        this.moveGrounded(dt, game, px + (dx / d) * toward, pz + (dz / d) * toward, this.def.speed * 0.55);
        this.faceToward(t.pos.x, t.pos.z, dt, 10);
        if (this.anim.name !== 'walk') this.anim.play('walk');
        // ranged shot while strafing
        if (this.def.ranged && this.rangedCd <= 0 && d < this.def.ranged.range) this.fireRanged(game, t);
        if (this.stateT <= 0) this.state = this.def.ranged && d < this.def.ranged.range ? 'strafe' : 'chase';
        break;
      }
      case 'block': {
        if (!t) { this.state = 'patrol'; break; }
        c.blocking = true;
        this.faceToward(t.pos.x, t.pos.z, dt, 10);
        this.moveGrounded(dt, game, 0, 0, 0);
        if (this.anim.name !== 'block') this.anim.play('block', { blend: 0.1 });
        if (this.stateT <= 0) { c.blocking = false; this.state = 'chase'; }
        break;
      }
      case 'retreat': {
        if (!t) { this.state = 'patrol'; break; }
        const dx = this.pos.x - t.pos.x, dz = this.pos.z - t.pos.z;
        const d = Math.hypot(dx, dz) || 1;
        this.moveGrounded(dt, game, dx / d, dz / d, this.def.speed * 0.85);
        this.faceToward(t.pos.x, t.pos.z, dt, 8);
        if (this.anim.name !== 'walk') this.anim.play('walk');
        if (this.def.ranged && this.rangedCd <= 0 && d < this.def.ranged.range) this.fireRanged(game, t);
        if (this.stateT <= 0) this.state = 'chase';
        break;
      }
      case 'attack': {
        if (!t) { this.state = 'chase'; break; }
        const d = this.distTo(t);
        this.faceToward(t.pos.x, t.pos.z, dt, 14);
        if (this.def.ranged && d > this.ai.attackRange && this.rangedCd <= 0) { this.fireRanged(game, t); break; }
        if (d <= this.ai.attackRange * 1.15 && this.attackCd <= 0) {
          const move = this.ai.moves[(Math.random() * this.ai.moves.length) | 0];
          const atkDef = NPC_ATTACKS[move];
          if (this.startAttack({ ...atkDef, move })) {
            this.attackCd = this.ai.cooldown * (0.8 + Math.random() * 0.5);
            this.state = 'chase';
            if (d > 2) this.game.audio.sfx(atkDef.anim.includes('heavy') || atkDef.anim === 'e_slam' ? 'swingHeavy' : 'swing');
          }
        } else {
          this.state = 'chase';
        }
        break;
      }
      default: this.state = 'patrol';
    }
    // dodge reaction: if target is attacking & close
    if (t && this.ai.dodgeChance > 0 && t.combat.attack && this.distTo(t) < 3 && Math.random() < this.ai.dodgeChance * 0.1) {
      this.dodgeSideways();
    }
    // separation
    game.world.separate(this, dt);
  }

  dodgeSideways() {
    if (!this.canAct()) return;
    this.anim.play('dodge', { restart: true, blend: 0.02 });
    this.combat.iframes = 0.3;
    const side = Math.random() < 0.5 ? 1 : -1;
    const f = this.forward();
    this.vel.x = -f.z * side * 9 + f.x * 2;
    this.vel.z = f.x * side * 9 + f.z * 2;
    this.game.audio.sfx('dodge');
  }

  fireRanged(game, t) {
    const r = this.def.ranged;
    this.rangedCd = r.cooldown * (0.85 + Math.random() * 0.4);
    this.faceToward(t.pos.x, t.pos.z, 0.05, 30);
    const f = this.forward();
    const from = { x: this.pos.x + f.x * 0.5, y: this.pos.y + 1.35, z: this.pos.z + f.z * 0.5 };
    const to = { x: t.pos.x, y: t.pos.y + 1.1, z: t.pos.z };
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const d = Math.hypot(dx, dy, dz) || 1;
    game.spawnProjectile({
      owner: this, pos: from,
      vel: { x: dx / d * r.projSpeed, y: dy / d * r.projSpeed + 1.2, z: dz / d * r.projSpeed },
      dmg: this.effAttack() * r.dmgMul, gravity: r.fire ? 0 : -6, fire: !!r.fire, life: 3,
    });
    game.audio.sfx(r.fire ? 'fire' : 'arrow');
    this.anim.play(r.fire ? 'e_cast' : 'e_thrust', { restart: true, speed: r.fire ? 1.4 : 2, blend: 0.05 });
  }

  takeDamage(amount, opts = {}) {
    const res = super.takeDamage(amount, opts);
    if ((res.result === 'hit' || res.result === 'guardbreak') && opts.from) {
      this.aggro = true;
      this.target = opts.from;
      if (this.state === 'patrol' || this.state === 'idle') this.state = 'chase';
      // squad assist
      if (this.ai.assistRadius > 0 && this.squadId) {
        for (const n of this.game.npcs) {
          if (n !== this && n.squadId === this.squadId && !n.combat.dead && n.distTo(this) < this.ai.assistRadius) {
            n.aggro = true; n.target = opts.from;
            if (n.state === 'patrol' || n.state === 'idle') n.state = 'chase';
          }
        }
      }
    }
    return res;
  }

  die() {
    if (this.combat.dead) return;
    super.die();
    this.alive = false;
    this.game.combat.onNpcKilled(this);
  }
}

function factionOf(enemyId) {
  if (enemyId.startsWith('bandit')) return 'bandit';
  if (enemyId === 'ashigaru_spear') return 'ashigaru';
  if (enemyId === 'ronin_duelist') return 'ronin';
  if (enemyId === 'elite_samurai') return 'castle';
  if (enemyId === 'ashura_adept') return 'ashura';
  if (enemyId === 'wraith' || enemyId === 'shadow_blade') return 'shade';
  if (enemyId === 'oni_shield') return 'oni';
  return 'bandit';
}
