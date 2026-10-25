// Inventory, equipment (with visible rig changes), currency.
import { ALL_ITEMS, itemDef, stackable } from '../data/items.js';
import { upgradeStats } from '../data/recipes.js';

export class Inventory {
  constructor(game) {
    this.game = game;
    this.items = new Map();        // key `${id}|${plus}` -> {id, qty, plus}
    this.coins = 30;
    this.equipped = { weapon: 'worn_katana', armor: 'straw_cloak', helmet: null, accessory: null };
  }

  key(id, plus) { return `${id}|${plus || 0}`; }

  addItem(id, qty = 1, plus = 0) {
    if (!ALL_ITEMS[id]) return false;
    if (stackable(id)) {
      const k = this.key(id, 0);
      const cur = this.items.get(k);
      if (cur) cur.qty += qty;
      else this.items.set(k, { id, qty, plus: 0 });
    } else {
      const k = this.key(id, plus);
      const cur = this.items.get(k);
      if (cur) cur.qty += qty;
      else this.items.set(k, { id, qty, plus: plus || 0 });
    }
    this.game.ui.hud.dirty = true;
    return true;
  }

  removeItem(id, qty = 1, plus = 0) {
    const k = this.key(id, plus);
    const cur = this.items.get(k);
    if (!cur || cur.qty < qty) return false;
    cur.qty -= qty;
    if (cur.qty <= 0) this.items.delete(k);
    return true;
  }

  count(id) {
    let n = 0;
    for (const [, it] of this.items) if (it.id === id) n += it.qty;
    return n;
  }

  entries() { return [...this.items.values()]; }

  has(id, qty = 1) { return this.count(id) >= qty; }

  addCoins(n) { this.coins = Math.max(0, this.coins + n); this.game.ui.hud.dirty = true; }
  spendCoins(n) {
    if (this.coins < n) return false;
    this.coins -= n;
    return true;
  }

  equippedStats() {
    const out = { weapon: { damage: 10, speed: 1, combo: 3, range: 2.3, crit: 5 }, defense: 0, attackPct: 0, staminaRegen: 0, crit: 0 };
    const wId = this.equipped.weapon;
    if (wId && ALL_ITEMS[wId]) {
      const it = this.items.get(this.key(wId, 0)) || this.items.get(this.key(wId, this.plusOf(wId)));
      const plus = it ? it.plus : 0;
      const w = ALL_ITEMS[wId];
      out.weapon = upgradeStats(w.stats, plus, 'weapon');
      out.weaponKey = wId; out.weaponPlus = plus; out.weaponName = w.name;
    }
    for (const slot of ['armor', 'helmet']) {
      const id = this.equipped[slot];
      if (!id) continue;
      const it = this.items.get(this.key(id, 0)) || this.items.get(this.key(id, this.plusOf(id)));
      const plus = it ? it.plus : 0;
      out.defense += upgradeStats(ALL_ITEMS[id].stats, plus, 'armor').defense;
    }
    const acc = this.equipped.accessory;
    if (acc && ALL_ITEMS[acc]) {
      const s = ALL_ITEMS[acc].stats;
      out.staminaRegen += s.staminaRegen || 0;
      out.crit += s.crit || 0;
      out.defense += s.defense || 0;
      out.attackPct += s.attackPct || 0;
      if (out.attackPct > 0) {
        // war_drum effect: +attack% when low hp → expose as buff value
        out.lowHpAttack = s.attackPct;
      }
    }
    return out;
  }

  plusOf(id) {
    for (const [, it] of this.items) if (it.id === id) return it.plus || 0;
    return 0;
  }

  equip(id) {
    const def = ALL_ITEMS[id];
    if (!def) return false;
    if (!this.has(id)) { this.game.ui.notify('bad', 'Không có vật phẩm này'); return false; }
    let slot;
    if (def.type === 'weapon') slot = 'weapon';
    else if (def.type === 'armor') slot = 'armor';
    else if (def.type === 'helmet') slot = 'helmet';
    else if (def.type === 'accessory') slot = 'accessory';
    else { this.useConsumable(id); return true; }
    this.equipped[slot] = id;
    this.applyToRig();
    this.game.progression.applyToPlayer();
    this.game.ui.notify('good', `Đã trang bị: ${def.name}`);
    this.game.audio.sfx('craft');
    return true;
  }

  unequip(slot) {
    if (slot === 'weapon') { this.game.ui.notify('bad', 'Không thể bỏ vũ khí'); return; }
    this.equipped[slot] = null;
    this.applyToRig();
    this.game.progression.applyToPlayer();
  }

  applyToRig() {
    const player = this.game.player;
    if (!player) return;
    const wId = this.equipped.weapon;
    if (wId) player.rig.setWeapon(ALL_ITEMS[wId].model);
    const aId = this.equipped.armor;
    player.rig.setArmor(aId ? ALL_ITEMS[aId] : null);
    const hId = this.equipped.helmet;
    player.rig.setHelmet(hId ? ALL_ITEMS[hId] : null);
  }

  useConsumable(id) {
    const def = ALL_ITEMS[id];
    if (!def || def.type !== 'consumable' || !this.has(id)) return false;
    const player = this.game.player;
    if (!player || player.combat.dead) return false;
    const u = def.use;
    if (u.heal) { player.heal(u.heal); this.game.ui.notify('good', `+${u.heal} máu`); }
    if (u.stamina) { player.restoreStamina(u.stamina); this.game.ui.notify('good', `+${u.stamina} khí lực`); }
    if (u.buff) player.addBuff(u.buff.stat === 'attackPct' ? 'attackPct' : u.buff.stat, u.buff.amount, u.buff.duration);
    this.removeItem(id, 1);
    this.game.audio.sfx('heal');
    this.game.ui.hud.dirty = true;
    return true;
  }

  serialize() {
    return {
      coins: this.coins,
      items: this.entries().map((e) => ({ id: e.id, qty: e.qty, plus: e.plus || 0 })),
      equipped: { ...this.equipped },
    };
  }

  apply(data) {
    if (!data) return;
    this.items.clear();
    this.coins = data.coins ?? 30;
    for (const it of data.items || []) {
      if (ALL_ITEMS[it.id]) this.items.set(this.key(it.id, it.plus), { id: it.id, qty: it.qty, plus: it.plus || 0 });
    }
    const eq = data.equipped || {};
    for (const slot of ['weapon', 'armor', 'helmet', 'accessory']) {
      const id = eq[slot];
      this.equipped[slot] = id && ALL_ITEMS[id] ? id : slot === 'weapon' ? 'worn_katana' : null;
    }
    if (!this.has(this.equipped.weapon)) this.addItem(this.equipped.weapon, 1);
  }
}
