// Boss: phases by HP, telegraphed specials, summons, intro, enrage.
import { Npc } from './npc.js';
import { BOSSES, BOSS_ATTACKS } from '../data/bosses.js';
import { NPC_ATTACKS } from '../data/enemies.js';

export class Boss extends Npc {
  constructor(game, { bossId, x, z, levelScale = 1 }) {
    const def = BOSSES[bossId];
    super(game, { enemyId: bossId, x, z, levelScale, bossDef: def });
    this.bossDef = def;
    this.isBoss = true;
    this.name = def.name;
    this.phaseIdx = 0;
    this.lastMoveIdx = -1;
    this.introT = 2.2;
    this.combat.iframes = 1.0; // brief invuln during intro
    this.attackQueue = [];
    this.telegraphs = [];
    this.faction = def.id === 'ronin_master' ? 'ronin' : def.id.includes('ashura') ? 'ashura' : def.id === 'oni_general' ? 'oni' : def.id === 'shogun_shade' ? 'shade' : 'bandit';
    this.ai = { sight: 60, attackRange: this.rangeFor(def), cooldown: 2.0, blockChance: def.id === 'ronin_master' ? 0.5 : 0.15, dodgeChance: def.id === 'ronin_master' ? 0.3 : 0.05, strafeChance: 0.35, assistRadius: 0, moves: def.phases[0].moves };
    this.def = { ...this.def, name: def.name, ranged: null, ai: this.ai };
  }

  rangeFor(def) { return def.scale > 1.3 ? 3.4 : 2.7; }

  currentPhase() {
    const hpPct = this.hp / this.maxHp;
    let idx = 0;
    for (let i = 0; i < this.bossDef.phases.length; i++) if (hpPct <= this.bossDef.phases[i].hpPct) idx = i;
    return idx;
  }

  startAttack(atkDef, opts = {}) {
    // telegraph specials
    if (atkDef.aoe) {
      const timeToHit = atkDef.dur * (Array.isArray(atkDef.hitAt) ? atkDef.hitAt[0] : atkDef.hitAt);
      this.game.vfx.telegraph(this.pos, atkDef.range, timeToHit, 0xff5a2a);
      this.game.audio.sfx('fire');
    }
    if (atkDef.projectileFan) {
      this.game.audio.sfx(atkDef.projectileFan.fire ? 'fire' : 'arrow');
      if (atkDef.telegraph) this.game.vfx.telegraph(this.pos, 2.2, atkDef.telegraph, 0x9a5aff);
    }
    return super.startAttack(atkDef, opts);
  }

  update(dt, game) {
    if (this.disposed) return;
    // intro
    if (this.introT > 0) {
      this.introT -= dt;
      if (this.anim.name !== 'bow' && this.introT > 0.6) { this.anim.play('bow', { restart: false }); }
      if (this.introT <= 0.6 && !this._roared) {
        this._roared = true;
        game.audio.sfx('roar');
        game.cameraRig.shake(0.4);
      }
      if (this.anim.name === 'bow' && this.introT <= 0.6) this.anim.play('idle', { restart: true });
      super.update(dt, game);
      return;
    }

    // phase transition
    const ph = this.currentPhase();
    if (ph !== this.phaseIdx) {
      this.phaseIdx = ph;
      const phase = this.bossDef.phases[ph];
      this.ai.moves = phase.moves;
      this.ai.cooldown = 2.0 * phase.cooldownMul;
      this.combat.iframes = 0.8;
      this._poise = 0;
      game.audio.sfx('roar');
      game.cameraRig.shake(0.5);
      game.vfx.popup(this.pos, 'GIAI ĐOẠN ' + (ph + 1), '#ff6a5a', true);
      game.particles.spawn({ x: this.pos.x, y: this.pos.y + 1.2, z: this.pos.z }, { count: 40, color: [0xff5a3a, 0xffd257, 0xffffff], speed: 8, life: 0.7, spread: 1.2 });
      if (phase.summons) {
        for (const s of phase.summons) {
          for (let i = 0; i < s.count; i++) {
            const a = Math.random() * Math.PI * 2;
            const sx = this.pos.x + Math.cos(a) * 4, sz = this.pos.z + Math.sin(a) * 4;
            game.spawnNpc({ enemyId: s.enemy, x: sx, z: sz, levelScale: 1 + this.levelScale * 0.2, noCount: true });
          }
        }
      }
    }

    // boss decision loop (replaces base decide timing; faster, patterned)
    if (!this.combat.attack && this.combat.staggered <= 0 && this.combat.parried <= 0) {
      this.decideT -= dt;
      const t = this.target && !this.target.combat.dead ? this.target : (this.perception(game) || game.player);
      this.target = t;
      const d = t ? this.distTo(t) : 99;
      const phase = this.bossDef.phases[this.phaseIdx];
      const speedMul = phase.speedMul;
      this.stats.speed = this.bossDef.speed * speedMul;

      if (this.decideT <= 0) {
        // pick a move (avoid repeating last)
        let idx;
        do { idx = (Math.random() * this.ai.moves.length) | 0; } while (idx === this.lastMoveIdx && this.ai.moves.length > 1);
        this.lastMoveIdx = idx;
        const moveName = this.ai.moves[idx];
        const atkDef = BOSS_ATTACKS[moveName] ? { ...BOSS_ATTACKS[moveName] } : { ...NPC_ATTACKS[moveName] };
        // ranged specials regardless of distance; melee needs range
        const isSpecial = !!BOSS_ATTACKS[moveName];
        const reach = isSpecial && (atkDef.projectileFan || atkDef.aoe === false) ? 30 : this.ai.attackRange + 0.6;
        if (d <= reach || (isSpecial && (atkDef.projectileFan || atkDef.aoe))) {
          if (isSpecial) {
            this.attackCd = this.ai.cooldown * 1.5;
            this.startAttack({ ...atkDef, move: moveName });
          } else if (d <= this.ai.attackRange + 0.5) {
            this.attackCd = this.ai.cooldown;
            this.startAttack({ ...atkDef, move: moveName });
          } else {
            this.decideT = 0.2;
          }
        } else {
          this.decideT = 0.2;
        }
      }
      // movement: approach
      if (t && !this.combat.attack) {
        if (d > this.ai.attackRange * 0.9) {
          const dx = t.pos.x - this.pos.x, dz = t.pos.z - this.pos.z;
          const l = Math.hypot(dx, dz) || 1;
          this.moveGrounded(dt, game, dx / l, dz / l, this.stats.speed * (0.8 + speedMul * 0.3));
          this.faceToward(t.pos.x, t.pos.z, dt, 8);
          if (this.anim.name !== 'run' && !this.combat.attack) this.anim.play('run');
        } else {
          this.faceToward(t.pos.x, t.pos.z, dt, 10);
          this.moveGrounded(dt, game, 0, 0, 0);
          if (this.anim.name !== 'idle' && !this.combat.attack) this.anim.play('idle');
        }
      }
    }
    super.update(dt, game);
  }

  takeDamage(amount, opts = {}) {
    if (this.introT > 0) return { result: 'iframes' };
    return super.takeDamage(amount, opts);
  }

  die() {
    if (this.combat.dead) return;
    super.die();
    const game = this.game;
    game.audio.sfx('roar');
    game.cameraRig.shake(0.7);
    game.particles.spawn({ x: this.pos.x, y: this.pos.y + 1.4, z: this.pos.z }, { count: 60, color: [0xffd257, 0xffffff, 0xff8a3a], speed: 10, life: 1.0, spread: 1.6, gravity: -2 });
  }
}
