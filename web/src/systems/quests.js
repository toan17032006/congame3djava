// Quest tracking: objectives progress, completion, rewards.
import { ALL_QUESTS, questsForLevel } from '../data/quests.js';
import { itemDef } from '../data/items.js';

export class QuestSystem {
  constructor(game) {
    this.game = game;
    this.active = new Map();    // qid -> {id, obj: Map(oid->count), done:false}
    this.completed = new Set();
  }

  activateForLevel(levelId) {
    for (const q of questsForLevel(levelId)) {
      if (this.completed.has(q.id) || this.active.has(q.id)) continue;
      this.active.set(q.id, { id: q.id, obj: new Map(q.objectives.map((o) => [o.id, 0])), done: false });
      this.game.ui.notify('quest', `Nhiệm vụ mới: ${q.name}`);
      this.game.audio.sfx('quest');
    }
  }

  // progress a matching objective
  progress(type, target, qty = 1) {
    for (const st of this.active.values()) {
      if (st.done) continue;
      const q = ALL_QUESTS[st.id];
      for (const o of q.objectives) {
        if (o.type !== type) continue;
        if (o.target && target && o.target !== target && o.target !== 'any') continue;
        const cur = st.obj.get(o.id) || 0;
        if (cur >= o.count) continue;
        st.obj.set(o.id, Math.min(o.count, cur + qty));
        this.game.ui.notify('quest', `${q.name}: ${o.text.replace(/\(0\/\d+\)/, '').trim()} ${st.obj.get(o.id)}/${o.count}`);
        this.game.ui.hud.dirty = true;
      }
      this.checkComplete(st, q);
    }
  }

  // generic event entry used by gameplay
  onEvent(type, data = {}) {
    if (type === 'kill') this.progress('kill', data.enemy, 1);
    if (type === 'collect') this.progress('collect', data.item, data.qty || 1);
    if (type === 'reach') this.progress('reach', data.target, 1);
    if (type === 'waves') this.progress('waves', null, data.count || 1);
    if (type === 'defend') this.progress('defend', null, data.seconds || 0);
    if (type === 'boss') this.progress('boss', data.boss, 1);
  }

  checkComplete(st, q) {
    for (const o of q.objectives) if ((st.obj.get(o.id) || 0) < o.count) return;
    st.done = true;
    this.active.delete(st.id);
    this.completed.add(st.id);
    const r = q.rewards || {};
    if (r.xp) this.game.progression.grantXp(r.xp);
    if (r.coins) { this.game.inventory.addCoins(r.coins); this.game.ui.notify('gold', `+${r.coins} vàng (nhiệm vụ)`); }
    for (const it of r.items || []) {
      this.game.inventory.addItem(it.id, it.qty);
      this.game.ui.notify('item', `Nhận ${itemDef(it.id).name} x${it.qty}`);
    }
    if (r.skillPoint) { this.game.progression.pointsSkill += r.skillPoint; this.game.ui.notify('level', `+${r.skillPoint} điểm kỹ năng`); }
    this.game.ui.notify('good', `Hoàn thành nhiệm vụ: ${q.name}`);
    this.game.audio.sfx('quest');
  }

  isCompleted(qid) { return this.completed.has(qid); }
  activeList() { return [...this.active.values()].map((st) => ({ ...st, quest: ALL_QUESTS[st.id] })); }
  completedList() { return [...this.completed].map((id) => ALL_QUESTS[id]).filter(Boolean); }

  serialize() {
    return {
      active: [...this.active.values()].map((st) => ({ id: st.id, obj: [...st.obj.entries()] })),
      completed: [...this.completed],
    };
  }

  apply(data) {
    this.active.clear();
    this.completed.clear();
    for (const id of (data?.completed || [])) if (ALL_QUESTS[id]) this.completed.add(id);
    for (const st of (data?.active || [])) {
      const q = ALL_QUESTS[st.id];
      if (!q) continue;
      const obj = new Map();
      for (const [oid, count] of st.obj || []) if (q.objectives.some((o) => o.id === oid)) obj.set(oid, count);
      this.active.set(st.id, { id: st.id, obj, done: false });
    }
  }
}
