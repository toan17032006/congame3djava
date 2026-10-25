// Crafting recipes. Upgrades (weapon/armor "+N") use UPGRADE_COSTS.
export const RECIPES = [
  { id: 'r_bandage', out: { id: 'bandage', qty: 2 }, coins: 4, cost: [{ id: 'herb', qty: 2 }] },
  { id: 'r_draught', out: { id: 'healing_draught', qty: 1 }, coins: 10, cost: [{ id: 'herb', qty: 3 }, { id: 'silk', qty: 1 }] },
  { id: 'r_tonic', out: { id: 'focus_tonic', qty: 1 }, coins: 6, cost: [{ id: 'herb', qty: 2 }, { id: 'bamboo', qty: 1 }] },
  { id: 'r_bell', out: { id: 'war_bell', qty: 1 }, coins: 20, cost: [{ id: 'demon_fang', qty: 1 }, { id: 'silk', qty: 1 }] },
  { id: 'r_ironkatana', out: { id: 'iron_katana', qty: 1 }, coins: 40, cost: [{ id: 'iron_ore', qty: 4 }, { id: 'bamboo', qty: 2 }] },
  { id: 'r_nodachi', out: { id: 'nodachi', qty: 1 }, coins: 80, cost: [{ id: 'iron_ore', qty: 6 }, { id: 'leather', qty: 3 }] },
  { id: 'r_wolffang', out: { id: 'wolf_fang', qty: 1 }, coins: 100, cost: [{ id: 'iron_ore', qty: 5 }, { id: 'demon_fang', qty: 1 }, { id: 'leather', qty: 2 }] },
  { id: 'r_roningarb', out: { id: 'ronin_garb', qty: 1 }, coins: 50, cost: [{ id: 'leather', qty: 4 }, { id: 'silk', qty: 2 }] },
  { id: 'r_ashigaru', out: { id: 'ashigaru_armor', qty: 1 }, coins: 60, cost: [{ id: 'iron_ore', qty: 5 }, { id: 'leather', qty: 2 }] },
  { id: 'r_jade', out: { id: 'jade_charm', qty: 1 }, coins: 50, cost: [{ id: 'iron_ore', qty: 2 }, { id: 'herb', qty: 3 }, { id: 'silk', qty: 1 }] },
];

export const UPGRADE_COSTS = {
  weapon: (plus) => ({ coins: 40 * plus, cost: [{ id: 'iron_ore', qty: 2 * plus }, { id: 'demon_fang', qty: Math.max(0, plus - 1) }] }),
  armor: (plus) => ({ coins: 30 * plus, cost: [{ id: 'leather', qty: 2 * plus }, { id: 'silk', qty: Math.max(0, plus - 1) }] }),
};
export const MAX_PLUS = 3;

export function upgradeStats(base, plus, type) {
  // each + adds 18% of the base primary stat, compounding
  if (plus <= 0) return base;
  const mul = Math.pow(1.18, plus);
  const out = { ...base };
  if (type === 'weapon') { out.damage = Math.round(base.damage * mul); }
  else { out.defense = Math.round(base.defense * mul); }
  return out;
}
