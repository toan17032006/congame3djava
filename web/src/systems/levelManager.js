// Level runtime: spawns, waves, objectives, completion, unlock chain.
import { LEVEL_MAP, LEVELS, nextLevelId } from '../data/levels.js';
import { REGIONS } from '../data/regions.js';
import { BOSSES } from '../data/bosses.js';
import { Npc } from '../entities/npc.js';
import { Boss } from '../entities/boss.js';
import { Weather } from '../gfx/particles.js';

export class LevelManager {
  constructor(game) {
    this.game = game;
    this.currentId = null;
    this.states = {};          // levelId -> 'unlocked' | 'completed'
    this.objectives = [];      // runtime copies {id, type, target, count, cur, done, text}
    this.waveQueue = [];       // {delay, units, fired}
    this.waveIdx = 0;
    this.waveTotal = 0;
    this.finalUnits = null;
    this.wavesFired = 0;
    this.defendAcc = 0;
    this.goalInteractable = null;
    this.levelTime = 0;
    this.completed = false;
    this.bannerPos = null;
  }

  isUnlocked(id) { return !!this.states[id]; }
  isCompleted(id) { return this.states[id] === 'completed'; }

  unlockInitial() {
    if (!this.states['L01']) this.states['L01'] = 'unlocked';
    // keep the chain consistent: first non-completed is unlocked
    for (const l of LEVELS) {
      if (this.states[l.id] === 'completed') continue;
      if (!this.states[l.id]) this.states[l.id] = 'unlocked';
      break;
    }
  }

  async startLevel(levelId, { respawnPlayer = true } = {}) {
    const g = this.game;
    const def = LEVEL_MAP[levelId];
    if (!def) return false;
    const region = REGIONS[def.region];
    this.currentId = levelId;
    this.completed = false;
    this.levelTime = 0;
    this.defendAcc = 0;
    this.waveQueue = [];
    this.waveIdx = 0;
    this.wavesFired = 0;

    // clear previous actors
    for (const n of [...g.npcs]) g.removeNpc(n, true);
    g.combat.clearProjectiles();
    g.weather?.dispose();

    g.world.loadRegion(region);
    g.sky.set(region);
    g.weather?.dispose();
    const weatherType = region.weather === 'fog' ? 'none' : region.weather === 'wind' ? 'leaves' : region.weather;
    g.weather = new Weather(g.engine.scene, weatherType);
    if (region.weather === 'fog') {
      g.engine.scene.fog.density = region.sky.fogDensity * 1.6;
    }
    g.engine.scene.fog.color.setHex(region.sky.bottom);

    // player placement
    const [sx, sz] = g.world.spawnPoint;
    if (respawnPlayer || g.player.combat.dead) g.player.respawn([sx, sz]);
    else { g.player.pos.set(sx, g.world.groundAt(sx, sz), sz); }
    g.player.yaw = Math.PI; // face north, toward the objective
    g.cameraRig.yaw = 0; g.cameraRig.pitch = 0.3;
    g.cameraRig.setLockTarget(null);
    g.player.lockOn = false; g.player.lockTarget = null;

    const levelScale = 1 + (def.tier - 1) * 0.22 + Math.max(0, g.progression.level - def.tier * 2) * 0.05;

    // static spawns
    for (const grp of def.spawns || []) {
      this.spawnGroup(grp, levelScale);
    }
    // waves
    if (def.waves) {
      this.waveTotal = def.waves.length;
      def.waves.forEach((w, i) => this.waveQueue.push({ delay: w.delay, units: w.units, fired: false, idx: i }));
    }
    this.finalUnits = def.finalUnits || null;
    this.finalUnitsFired = false;
    // allies & villagers
    for (const grp of def.allies || []) {
      for (let i = 0; i < grp.count; i++) {
        const [x, z] = this.scatterPoint('ring', 8 + i * 2);
        g.spawnNpc({ enemyId: grp.enemy, x, z, levelScale: 1 });
      }
    }
    if (def.region === 'village' || def.region === 'village_siege') {
      for (let i = 0; i < 3; i++) {
        const [x, z] = this.scatterPoint('ring', 10 + i * 3);
        g.spawnNpc({ enemyId: 'villager', x, z, levelScale: 1 });
      }
    }
    // boss
    g.currentBoss = null;
    if (def.boss) {
      const bx = g.world.goalPos[0], bz = g.world.goalPos[2] + 6;
      const boss = new Boss(g, { bossId: def.boss, x: bx, z: bz, levelScale });
      g.npcs.push(boss);
      g.currentBoss = boss;
      g.ui.hud.setBoss(boss);
      g.ui.notify('boss', BOSSES[def.boss].intro || '');
    }
    // resource nodes
    g.world.spawnResourceNodes(def.resourceNodes);
    // shrine at spawn (respawn point)
    g.world.addInteractable({ type: 'shrine', x: sx + 3, z: sz - 2 });
    g.progression.respawnPoint = { x: sx, z: sz };
    // merchant in friendly levels
    if (['village', 'battlefield', 'village_siege', 'castle_approach', 'shrine', 'outskirts'].includes(def.region)) {
      g.world.addInteractable({ type: 'merchant', x: sx - 4, z: sz - 4 });
    }
    // chest with loot
    const crng = Math.random;
    const cx = (crng() - 0.5) * 40, cz = (crng() - 0.5) * 40;
    g.world.addInteractable({ type: 'chest', x: cx, z: cz, data: { loot: [{ id: 'bandage', qty: 2 }, { id: 'iron_ore', qty: 2 }], coins: 25 + def.tier * 15 } });
    // goal marker for reach objectives
    this.goalInteractable = null;
    const hasReach = (def.objectives || []).some((o) => o.type === 'reach');
    if (hasReach) {
      const [gx, gz] = g.world.goalPos;
      this.goalInteractable = g.world.addInteractable({ type: 'goal', x: gx, z: gz, radius: 3, data: { name: 'Mục tiêu' } });
    }
    // defend banner position
    this.bannerPos = def.region === 'battlefield' ? { x: 0, z: -6 } : null;

    // objectives
    this.objectives = (def.objectives || []).map((o) => ({ ...o, cur: 0, done: false, text: o.text || this.objectiveText(o) }));
    g.quests.activateForLevel(levelId);
    g.ui.hud.setObjectives(this.objectives);
    g.ui.hud.setLevel(def, this.waveTotal);
    if (def.tip) g.ui.notify('info', def.tip);
    g.audio.startAmbient(region.weather === 'rain' ? 'rain' : 'wind');
    g.audio.startMusic();
    return true;
  }

  objectiveText(o) {
    const enemyNames = { bandit_grunt: 'sơn tặc', bandit_archer: 'cung thủ', bandit_brute: 'bạo đồ', ashigaru_spear: 'lính mác', ronin_duelist: 'ronin', elite_samurai: 'vệ sĩ', ashura_adept: 'tín đồ Tu La', wraith: 'vong linh', shadow_blade: 'bóng kiếm', oni_shield: 'quỷ khiên thủ' };
    const names = { kill: 'Hạ ', collect: 'Thu ', reach: 'Đến điểm mục tiêu', waves: 'Chặn đợt tấn công', defend: 'Giữ vị trí', boss: 'Hạ BOSS' };
    const targetName = enemyNames[o.target] || (o.target ? String(o.target).replace('_', ' ') : '');
    let text = (names[o.type] || o.type) + (o.type === 'kill' ? targetName : '');
    if (o.count > 1) text += ` (0/${o.count})`;
    return text;
  }

  scatterPoint(area, seedR = 0) {
    const size = this.game.world.def.size / 2 - 8;
    const r = Math.random;
    switch (area) {
      case 'path': return [(r() - 0.5) * 10, (r() - 0.5) * size * 1.1];
      case 'ring': { const a = r() * Math.PI * 2, rad = 14 + r() * 16 + seedR; return [Math.cos(a) * rad, Math.sin(a) * rad]; }
      case 'far': return [(r() - 0.5) * size * 0.8, -size * (0.35 + r() * 0.5)];
      case 'center': default: return [(r() - 0.5) * 16, (r() - 0.5) * 16];
    }
  }

  spawnGroup(grp, levelScale) {
    const g = this.game;
    for (let i = 0; i < grp.count; i++) {
      const [x, z] = this.scatterPoint(grp.area || 'ring', i * 1.7);
      g.spawnNpc({ enemyId: grp.enemy, x, z, levelScale });
    }
  }

  update(dt) {
    const g = this.game;
    if (!this.currentId || this.completed) return;
    const def = LEVEL_MAP[this.currentId];
    this.levelTime += dt;
    const player = g.player;

    // waves
    for (const w of this.waveQueue) {
      if (w.fired) continue;
      w.delay -= dt;
      if (w.delay <= 0) {
        w.fired = true;
        this.wavesFired++;
        g.ui.notify('warn', `Đợt tấn công ${this.wavesFired}/${this.waveTotal}!`);
        g.audio.sfx('roar');
        for (const u of w.units) {
          const scale = 1 + (def.tier - 1) * 0.22;
          for (let i = 0; i < u.count; i++) {
            const edge = (Math.random() * 4) | 0;
            const S = g.world.def.size / 2 - 10;
            const pos = [[0, S], [0, -S], [S, 0], [-S, 0]][edge];
            g.spawnNpc({ enemyId: u.enemy, x: pos[0] + (Math.random() - 0.5) * 8, z: pos[1] + (Math.random() - 0.5) * 8, levelScale: scale });
          }
        }
        g.quests.onEvent('waves', { count: 1 });
        this.progress('waves', null, 1);
      }
    }
    // final units after all waves done
    if (this.finalUnits && !this.finalUnitsFired && this.wavesFired >= this.waveTotal) {
      const remaining = g.npcs.some((n) => !n.combat.dead && !['samurai_ally', 'villager'].includes(n.faction));
      if (!remaining) {
        this.finalUnitsFired = true;
        for (const u of this.finalUnits) {
          const scale = 1 + (def.tier - 1) * 0.22;
          for (let i = 0; i < u.count; i++) {
            const [x, z] = this.scatterPoint('ring', i * 2);
            g.spawnNpc({ enemyId: u.enemy, x, z, levelScale: scale });
          }
        }
        if (this.finalUnits.length) g.ui.notify('warn', 'Chỉ huy của chúng xuất hiện!');
      }
    }

    // defend objective
    const defend = this.objectives.find((o) => o.type === 'defend' && !o.done);
    if (defend && this.bannerPos) {
      const d = Math.hypot(player.pos.x - this.bannerPos.x, player.pos.z - this.bannerPos.z);
      if (d < 15 && !player.combat.dead) {
        this.defendAcc += dt;
        const whole = Math.floor(this.defendAcc);
        if (whole > defend.cur) { defend.cur = whole; g.quests.onEvent('defend', { seconds: 1 }); g.ui.hud.setObjectives(this.objectives); }
        if (defend.cur >= defend.count) { defend.done = true; this.checkObjectives(); }
      }
    }

    // reach objective
    const reach = this.objectives.find((o) => o.type === 'reach' && !o.done);
    if (reach && this.goalInteractable) {
      const d = Math.hypot(player.pos.x - this.goalInteractable.x, player.pos.z - this.goalInteractable.z);
      if (d < 4) {
        reach.cur = 1; reach.done = true;
        g.quests.onEvent('reach', { target: 'goal' });
        g.audio.sfx('gate');
        this.checkObjectives();
      }
    }
  }

  progress(type, target, qty = 1) {
    const def = LEVEL_MAP[this.currentId];
    if (!def) return;
    let changed = false;
    for (const o of this.objectives) {
      if (o.done || o.type !== type) continue;
      if (o.target && target && o.target !== target && o.target !== 'any') continue;
      o.cur = Math.min(o.count, o.cur + qty);
      changed = true;
      if (o.cur >= o.count) o.done = true;
    }
    if (changed) {
      this.game.ui.hud.setObjectives(this.objectives);
      this.checkObjectives();
    }
  }

  onKill(npc) {
    if (npc.faction === 'samurai_ally' || npc.faction === 'villager') return;
    if (!this.currentId || this.completed) return;
    this.progress('kill', npc.enemyId, 1);
    if (npc.isBoss) {
      this.progress('boss', npc.bossDef.id, 1);
      this.game.quests.onEvent('boss', { boss: npc.bossDef.id });
    }
  }

  checkObjectives() {
    if (this.objectives.every((o) => o.done)) this.completeLevel();
  }

  completeLevel() {
    if (this.completed) return;
    const g = this.game;
    const def = LEVEL_MAP[this.currentId];
    this.completed = true;
    this.states[this.currentId] = 'completed';
    const next = nextLevelId(this.currentId);
    if (next && !this.states[next]) this.states[next] = 'unlocked';
    // rewards
    const r = def.rewards || {};
    const rewardSummary = [];
    if (r.xp) { g.progression.grantXp(r.xp); rewardSummary.push(`${r.xp} KN`); }
    if (r.coins) { g.inventory.addCoins(r.coins); rewardSummary.push(`${r.coins} vàng`); }
    for (const it of r.items || []) { g.inventory.addItem(it.id, it.qty); rewardSummary.push(`${it.qty}x ${it.id}`); }
    if (r.skillPoint) { g.progression.pointsSkill += r.skillPoint; rewardSummary.push('+1 điểm kỹ năng'); }
    g.saveSystem.save(g.currentSlot, { silent: true });
    g.audio.sfx('unlock');
    g.onLevelComplete(def, next, rewardSummary);
  }

  serialize() { return { states: { ...this.states } }; }
  apply(data) { this.states = (data && data.states) || {}; this.unlockInitial(); }
}
