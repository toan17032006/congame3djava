// Crafting + equipment upgrades.
import { RECIPES, UPGRADE_COSTS, MAX_PLUS } from '../data/recipes.js';
import { itemDef } from '../data/items.js';

export class Crafting {
  constructor(game) { this.game = game; }

  recipes() { return RECIPES; }

  canCraft(recipe) {
    const inv = this.game.inventory;
    if (inv.coins < (recipe.coins || 0)) return { ok: false, reason: 'Không đủ vàng' };
    for (const c of recipe.cost || []) {
      if (!inv.has(c.id, c.qty)) return { ok: false, reason: `Thiếu ${itemDef(c.id).name} x${c.qty}` };
    }
    return { ok: true };
  }

  craft(recipeId) {
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return false;
    const chk = this.canCraft(recipe);
    if (!chk.ok) { this.game.ui.notify('bad', chk.reason); return false; }
    const inv = this.game.inventory;
    inv.spendCoins(recipe.coins || 0);
    for (const c of recipe.cost || []) inv.removeItem(c.id, c.qty);
    inv.addItem(recipe.out.id, recipe.out.qty);
    this.game.ui.notify('good', `Đã chế tạo: ${itemDef(recipe.out.id).name} x${recipe.out.qty}`);
    this.game.audio.sfx('craft');
    this.game.quests.onEvent('craft', { item: recipe.out.id });
    return true;
  }

  upgradeInfo(kind, id) {
    const inv = this.game.inventory;
    const plus = inv.plusOf(id);
    if (plus >= MAX_PLUS) return { ok: false, reason: 'Đã đạt cấp tối đa' };
    const cost = UPGRADE_COSTS[kind](plus + 1);
    for (const c of cost.cost) if (!inv.has(c.id, c.qty)) return { ok: false, reason: `Thiếu ${itemDef(c.id).name} x${c.qty}`, cost };
    if (inv.coins < cost.coins) return { ok: false, reason: 'Không đủ vàng', cost };
    return { ok: true, cost, next: plus + 1 };
  }

  upgrade(id) {
    const inv = this.game.inventory;
    const def = itemDef(id);
    const kind = def.type === 'weapon' ? 'weapon' : def.type === 'armor' || def.type === 'helmet' ? 'armor' : null;
    if (!kind) { this.game.ui.notify('bad', 'Không thể nâng cấp vật phẩm này'); return false; }
    const info = this.upgradeInfo(kind, id);
    if (!info.ok) { this.game.ui.notify('bad', info.reason); return false; }
    inv.spendCoins(info.cost.coins);
    for (const c of info.cost.cost) inv.removeItem(c.id, c.qty);
    // non-stackable: bump plus on the single entry
    for (const [k, it] of inv.items) {
      if (it.id === id) { it.plus = (it.plus || 0) + 1; inv.items.delete(k); inv.items.set(inv.key(id, it.plus), it); break; }
    }
    this.game.progression.applyToPlayer();
    this.game.ui.notify('good', `${def.name} +${info.next}`);
    this.game.audio.sfx('craft');
    return true;
  }
}
