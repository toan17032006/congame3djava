// XP/levels, attributes, skill tree state, derived stats.
import { aggregatePassives, ALL_SKILLS, SKILL_TREE } from '../data/skills.js';

export const ATTRS = [
  { id: 'str', name: 'Lực', desc: '+2 công kích mỗi điểm' },
  { id: 'agi', name: 'Mẫn', desc: '+0.5% chí mạng mỗi điểm' },
  { id: 'vit', name: 'Thể', desc: '+12 máu, +0.5 phòng thủ mỗi điểm' },
  { id: 'end', name: 'Nội', desc: '+8 khí lực mỗi điểm' },
];

export class Progression {
  constructor(game) {
    this.game = game;
    this.level = 1;
    this.xp = 0;
    this.attrs = { str: 1, agi: 1, vit: 1, end: 1 };
    this.pointsAttr = 0;
    this.pointsSkill = 1;
    this.learned = ['blade_2'];          // Nhất Đao Trảm miễn phí lúc đầu
    this.equippedActive = 'blade_2';
    this.respawnPoint = null;
    this.stats = { kills: 0, deaths: 0, playtime: 0 };
    this._passives = aggregatePassives(this.learned);
  }

  xpForLevel(n) { return Math.round(60 * Math.pow(n, 1.55)); }
  xpProgress() { return { cur: this.xp, need: this.xpForLevel(this.level) }; }

  p() { return this._passives; }

  grantXp(amount) {
    const gain = Math.round(amount * (1 + this._passives.xpGain));
    this.xp += gain;
    this.game.ui.notify('xp', `+${gain} kinh nghiệm`);
    let leveled = false;
    while (this.xp >= this.xpForLevel(this.level)) {
      this.xp -= this.xpForLevel(this.level);
      this.level++;
      this.pointsAttr++;
      this.pointsSkill++;
      leveled = true;
    }
    if (leveled) {
      this.game.ui.notify('level', `LÊN CẤP ${this.level}! +1 điểm thuộc tính, +1 điểm kỹ năng`);
      this.game.audio.sfx('levelup');
      this.game.particles.spawn({ x: this.game.player.pos.x, y: this.game.player.pos.y + 0.5, z: this.game.player.pos.z },
        { count: 30, color: [0xffd257, 0xfff0b0, 0x7ae0ff], speed: 4, life: 0.9, gravity: 2, spread: 0.8 });
      this.applyToPlayer();
      this.game.player.hp = this.game.player.maxHp;
    }
    this.game.ui.hud.dirty = true;
  }

  applyToPlayer() {
    const player = this.game.player;
    if (!player) return;
    this._passives = aggregatePassives(this.learned);
    const w = this.game.inventory.equippedStats().weapon;
    const armorDef = this.game.inventory.equippedStats().defense;
    const a = this.attrs;
    player.stats.maxHp = Math.round(80 + a.vit * 12 + (this.level - 1) * 5 + this._passives.maxHp);
    player.stats.attack = Math.round(w.damage + a.str * 2 + (this.level - 1) * 1.2 + this._passives.attackFlat);
    player.stats.defense = Math.round(armorDef + a.vit * 0.5 + this._passives.defense);
    player.maxStamina = Math.round(90 + a.end * 8 + (this.level - 1) * 3 + this._passives.maxStamina);
    player.hp = Math.min(player.hp, player.stats.maxHp);
    player.stamina = Math.min(player.stamina, player.maxStamina);
  }

  canLearn(id) {
    const node = ALL_SKILLS[id];
    if (!node || this.learned.includes(id)) return { ok: false, reason: 'Đã học' };
    if (this.pointsSkill < node.cost) return { ok: false, reason: 'Không đủ điểm kỹ năng' };
    for (const req of node.requires) if (!this.learned.includes(req)) return { ok: false, reason: 'Cột mốc trước chưa mở' };
    return { ok: true };
  }

  learn(id) {
    const chk = this.canLearn(id);
    if (!chk.ok) { this.game.ui.notify('bad', chk.reason); return false; }
    const node = ALL_SKILLS[id];
    this.pointsSkill -= node.cost;
    this.learned.push(id);
    if (node.active) this.equippedActive = id;
    this._passives = aggregatePassives(this.learned);
    this.applyToPlayer();
    this.game.ui.notify('good', `Đã học: ${node.name}`);
    this.game.audio.sfx('unlock');
    return true;
  }

  activeSkill() {
    const node = ALL_SKILLS[this.equippedActive];
    if (!node || !node.active || !this.learned.includes(this.equippedActive)) return null;
    return { skill: node.active.skill, ...node.active, name: node.name };
  }

  spendAttr(id) {
    if (this.pointsAttr <= 0) return false;
    this.pointsAttr--;
    this.attrs[id]++;
    this.applyToPlayer();
    return true;
  }

  serialize() {
    return {
      level: this.level, xp: this.xp, attrs: { ...this.attrs },
      pointsAttr: this.pointsAttr, pointsSkill: this.pointsSkill,
      learned: [...this.learned], equippedActive: this.equippedActive,
      respawnPoint: this.respawnPoint ? { ...this.respawnPoint } : null,
      stats: { ...this.stats },
    };
  }

  apply(data) {
    if (!data) return;
    this.level = data.level || 1;
    this.xp = data.xp || 0;
    this.attrs = { str: 1, agi: 1, vit: 1, end: 1, ...(data.attrs || {}) };
    this.pointsAttr = data.pointsAttr || 0;
    this.pointsSkill = data.pointsSkill ?? 0;
    this.learned = Array.isArray(data.learned) ? data.learned.filter((id) => ALL_SKILLS[id]) : [];
    this.equippedActive = data.equippedActive && this.learned.includes(data.equippedActive) ? data.equippedActive : (this.learned.find((id) => ALL_SKILLS[id]?.active) || null);
    this.respawnPoint = data.respawnPoint || null;
    this.stats = { kills: 0, deaths: 0, playtime: 0, ...(data.stats || {}) };
    this._passives = aggregatePassives(this.learned);
  }
}
