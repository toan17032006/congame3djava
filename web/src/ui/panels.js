// Panels: inventory/equipment, skill tree, crafting, quest log, map, shop.
import { ALL_ITEMS, itemDef, RARITY, CURRENCY } from '../data/items.js';
import { SKILL_TREE, ALL_SKILLS } from '../data/skills.js';
import { RECIPES, upgradeStats, MAX_PLUS } from '../data/recipes.js';
import { esc } from '../core/utils.js';
import { factionColor } from '../systems/factions.js';

const TABS = [
  { id: 'inventory', label: 'Túi đồ', key: 'Tab' },
  { id: 'skills', label: 'Kỹ năng', key: 'T' },
  { id: 'crafting', label: 'Chế tạo', key: 'G' },
  { id: 'quests', label: 'Nhiệm vụ', key: 'Q' },
  { id: 'map', label: 'Bản đồ', key: 'M' },
];

export class Panels {
  constructor(game) {
    this.game = game;
    this.open = null;
    this.root = document.createElement('div');
    this.root.className = 'panels';
    this.root.style.display = 'none';
    this.root.innerHTML = `
      <div class="panel-modal">
        <div class="panel-tabs" id="panel-tabs"></div>
        <div class="panel-body" id="panel-body"></div>
        <button class="panel-close" id="panel-close">✕ ESC</button>
      </div>`;
    document.getElementById('ui').appendChild(this.root);
    this.root.querySelector('#panel-close').addEventListener('click', () => this.closeAll());
    this.renderTabs();
  }

  renderTabs() {
    const tabs = this.root.querySelector('#panel-tabs');
    tabs.innerHTML = TABS.map((t) => `<button data-tab="${t.id}">${t.label} <i>${t.key}</i></button>`).join('');
    tabs.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => this.show(b.dataset.tab)));
  }

  isOpen() { return !!this.open; }

  toggle(id) {
    if (this.open === id) this.closeAll();
    else this.show(id);
  }

  show(id) {
    if (this.game.state !== 'playing' && this.game.state !== 'paused') return;
    this.open = id;
    this.root.style.display = 'flex';
    this.game.input.enabled = false;
    this.game.input.releasePointer();
    this.game.audio.sfx('ui');
    this.render();
  }

  closeAll() {
    if (!this.open) return;
    this.open = null;
    this.root.style.display = 'none';
    if (this.game.state === 'playing') {
      this.game.input.enabled = true;
      this.game.input.requestPointer();
    }
  }

  render() {
    const body = this.root.querySelector('#panel-body');
    this.root.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === this.open));
    if (this.open === 'inventory') this.renderInventory(body);
    if (this.open === 'skills') this.renderSkills(body);
    if (this.open === 'crafting') this.renderCrafting(body);
    if (this.open === 'quests') this.renderQuests(body);
    if (this.open === 'map') this.renderMap(body);
    if (this.open === 'shop') this.renderShop(body);
  }

  openShop() { this.show('shop'); }

  rarityColor(r) { return RARITY[r]?.color || '#fff'; }

  itemRow(id, plus, qty, actions = '') {
    const def = itemDef(id);
    const equipped = Object.values(this.game.inventory.equipped).includes(id);
    const statLine = def.stats ? Object.entries(def.stats).map(([k, v]) => {
      const names = { damage: 'Công', defense: 'Thủ', speed: 'Tốc', stamina: 'Khí', combo: 'Combo', range: 'Tầm', crit: ' Chí mạng%', staminaRegen: 'Hồi khí', attackPct: '%Công' };
      return `${names[k] || k} ${v}`;
    }).join(' · ') : '';
    return `<div class="item-row" style="border-color:${this.rarityColor(def.rarity)}">
      <span class="item-icon">${def.icon}</span>
      <span class="item-info">
        <b style="color:${this.rarityColor(def.rarity)}">${esc(def.name)}${plus ? ` <span class="plus">+${plus}</span>` : ''}</b>
        <span class="dim">${esc(def.desc || '')}</span>
        ${statLine ? `<span class="statline">${esc(statLine)}</span>` : ''}
      </span>
      <span class="item-qty">${qty > 1 ? `x${qty}` : ''}${equipped ? ' <i class="equipped">đang mang</i>' : ''}</span>
      <span class="item-actions">${actions}</span>
    </div>`;
  }

  renderInventory(body) {
    const inv = this.game.inventory;
    const eq = inv.equipped;
    const entries = inv.entries().sort((a, b) => (ALL_ITEMS[a.id].type + a.id).localeCompare(ALL_ITEMS[b.id].type + b.id));
    body.innerHTML = `
      <div class="inv-layout">
        <div class="equip-col">
          <h3>Trang bị</h3>
          ${['weapon', 'armor', 'helmet', 'accessory'].map((slot) => {
            const id = eq[slot];
            const def = id ? itemDef(id) : null;
            const plus = id ? inv.plusOf(id) : 0;
            const canUpgrade = id && (def.type === 'weapon' || def.type === 'armor' || def.type === 'helmet');
            return `<div class="equip-slot">
              <span class="dim">${{ weapon: 'Vũ khí', armor: 'Giáp', helmet: 'Đầu', accessory: 'Phụ kiện' }[slot]}</span>
              <b style="color:${def ? this.rarityColor(def.rarity) : '#666'}">${def ? esc(def.name) + (plus ? ` +${plus}` : '') : '— trống —'}</b>
              ${id && slot !== 'weapon' ? `<button data-uneq="${slot}">Tháo</button>` : ''}
              ${canUpgrade ? `<button data-upg="${id}">Nâng cấp</button>` : ''}
            </div>`;
          }).join('')}
          <div class="stat-summary" id="stat-summary"></div>
        </div>
        <div class="bag-col">
          <h3>Túi đồ <span class="dim">(${CURRENCY.icon} ${inv.coins})</span></h3>
          <div class="bag-list">
            ${entries.length ? entries.map((e) => {
              const def = itemDef(e.id);
              let actions = '';
              if (def.type === 'weapon' || def.type === 'armor' || def.type === 'helmet' || def.type === 'accessory') actions += `<button data-eq="${e.id}">Mang</button>`;
              if (def.type === 'consumable') actions += `<button data-use="${e.id}">Dùng</button>`;
              return this.itemRow(e.id, e.plus, e.qty, actions);
            }).join('') : '<p class="dim">Túi trống.</p>'}
          </div>
        </div>
      </div>`;
    // stat summary
    const p = this.game.player;
    const st = inv.equippedStats();
    body.querySelector('#stat-summary').innerHTML = `
      <h3>Chỉ số</h3>
      <ul>
        <li>Máu: <b>${Math.ceil(p.hp)}/${p.maxHp}</b></li>
        <li>Công kích: <b>${p.effAttack().toFixed(0)}</b> (vũ khí ${st.weapon.damage}${st.weaponPlus ? '+' + st.weaponPlus : ''})</li>
        <li>Phòng thủ: <b>${p.effDefense()}</b></li>
        <li>Khí lực: <b>${Math.ceil(p.stamina)}/${p.maxStamina}</b></li>
        <li>Chí mạng: <b>${(5 + this.game.progression.attrs.agi * 0.5 + st.weapon.crit + st.crit).toFixed(0)}%</b></li>
        <li>Điểm: <b>${this.game.progression.pointsAttr}</b> thuộc tính, <b>${this.game.progression.pointsSkill}</b> kỹ năng</li>
      </ul>
      <div class="attr-row">${['str', 'agi', 'vit', 'end'].map((a) => {
        const names = { str: 'Lực', agi: 'Mẫn', vit: 'Thể', end: 'Nội' };
        return `<button data-attr="${a}" ${this.game.progression.pointsAttr <= 0 ? 'disabled' : ''}>${names[a]} ${this.game.progression.attrs[a]} +</button>`;
      }).join('')}</div>`;
    // actions
    body.querySelectorAll('[data-eq]').forEach((b) => b.addEventListener('click', () => { this.game.inventory.equip(b.dataset.eq); this.render(); }));
    body.querySelectorAll('[data-use]').forEach((b) => b.addEventListener('click', () => { this.game.inventory.useConsumable(b.dataset.use); this.render(); }));
    body.querySelectorAll('[data-uneq]').forEach((b) => b.addEventListener('click', () => { this.game.inventory.unequip(b.dataset.uneq); this.render(); }));
    body.querySelectorAll('[data-upg]').forEach((b) => b.addEventListener('click', () => { this.game.crafting.upgrade(b.dataset.upg); this.render(); }));
    body.querySelectorAll('[data-attr]').forEach((b) => b.addEventListener('click', () => { this.game.progression.spendAttr(b.dataset.attr); this.render(); }));
  }

  renderSkills(body) {
    const prog = this.game.progression;
    body.innerHTML = `
      <div class="skill-layout">
        <p>Điểm kỹ năng: <b>${prog.pointsSkill}</b> · Kỹ năng đang gán phím U: <b>${prog.activeSkill()?.name || '—'}</b></p>
        <div class="skill-tree">
        ${Object.entries(SKILL_TREE).map(([branchId, branch]) => `
          <div class="skill-branch" style="--branch-color:${branch.color}">
            <h4>${esc(branch.name)}</h4>
            ${branch.nodes.map((n) => {
              const learned = prog.learned.includes(n.id);
              const can = prog.canLearn(n.id).ok;
              return `<div class="skill-node ${learned ? 'learned' : ''} ${can ? 'can-learn' : ''}" data-skill="${n.id}">
                <b>${esc(n.name)}</b> <span class="dim">T${n.tier} · ${n.cost}đ</span>
                <span class="dim">${esc(n.desc || (n.active && n.active.desc) || '')}</span>
                ${learned ? (n.active && prog.equippedActive === n.id ? '<i class="equipped">đang gán U</i>' : n.active ? `<button data-equipactive="${n.id}">Gán U</button>` : '') : `<button data-learn="${n.id}" ${can ? '' : 'disabled'}>Học</button>`}
              </div>`;
            }).join('')}
          </div>`).join('')}
        </div>
      </div>`;
    body.querySelectorAll('[data-learn]').forEach((b) => b.addEventListener('click', () => { this.game.progression.learn(b.dataset.learn); this.render(); }));
    body.querySelectorAll('[data-equipactive]').forEach((b) => b.addEventListener('click', () => { this.game.progression.equippedActive = b.dataset.equipactive; this.render(); }));
  }

  renderCrafting(body) {
    const craft = this.game.crafting;
    body.innerHTML = `
      <div class="craft-layout">
        <h3>Công thức chế tạo</h3>
        <div class="recipe-list">
        ${RECIPES.map((r) => {
          const chk = craft.canCraft(r);
          const costStr = [(r.coins ? `${CURRENCY.icon}${r.coins}` : ''), ...(r.cost || []).map((c) => `${itemDef(c.id).icon}${itemDef(c.id).name} x${c.qty}`)].join(', ');
          return `<div class="recipe-row ${chk.ok ? '' : 'disabled'}">
            <span class="item-icon">${itemDef(r.out.id).icon}</span>
            <span class="item-info"><b>${esc(itemDef(r.out.id).name)} x${r.out.qty}</b><span class="dim">${esc(costStr)}</span></span>
            <button data-craft="${r.id}" ${chk.ok ? '' : 'disabled'}>Chế tạo</button>
          </div>`;
        }).join('')}
        </div>
        <p class="dim">Nâng cấp +1..+3: chọn vật phẩm trong Túi đồ → "Nâng cấp" (tốn quặng/da/lụa và vàng, tăng 18% chỉ số chính mỗi cấp).</p>
      </div>`;
    body.querySelectorAll('[data-craft]').forEach((b) => b.addEventListener('click', () => { this.game.crafting.craft(b.dataset.craft); this.render(); }));
  }

  renderQuests(body) {
    const qs = this.game.quests;
    const active = qs.activeList();
    const done = qs.completedList();
    body.innerHTML = `
      <div class="quest-layout">
        <h3>Đang thực hiện (${active.length})</h3>
        ${active.length ? active.map((st) => `
          <div class="quest-card">
            <b>${esc(st.quest.name)}</b> <i class="qtype ${st.quest.type}">${st.quest.type === 'main' ? 'Chính' : 'Phụ'}</i>
            <p class="dim">${esc(st.quest.desc)}</p>
            <ul>${st.quest.objectives.map((o) => `<li class="${(st.obj.get(o.id) || 0) >= o.count ? 'done' : ''}">${esc(o.text)} ${st.obj.get(o.id) || 0}/${o.count}</li>`).join('')}</ul>
          </div>`).join('') : '<p class="dim">Không có nhiệm vụ nào đang mở.</p>'}
        <h3>Đã hoàn thành (${done.length})</h3>
        ${done.length ? `<ul class="done-list">${done.map((q) => `<li>✔ ${esc(q.name)}</li>`).join('')}</ul>` : '<p class="dim">Chưa hoàn thành nhiệm vụ nào.</p>'}
      </div>`;
  }

  renderMap(body) {
    const g = this.game;
    const def = g.world.def;
    if (!def) { body.innerHTML = '<p class="dim">Chưa vào khu vực nào.</p>'; return; }
    body.innerHTML = `
      <div class="map-layout">
        <h3>${esc(def.name)}</h3>
        <canvas id="map-canvas" width="640" height="480"></canvas>
        <p class="dim">🟪 bạn · 🔴 địch · 🟡 đài hồi sinh · 🟢 tài nguyên · 🟦 mục tiêu · 🟧 cổng mục tiêu</p>
      </div>`;
    const cv = body.querySelector('#map-canvas');
    const ctx = cv.getContext('2d');
    const S = def.size;
    const toCv = (x, z) => [((x + S / 2) / S) * cv.width, ((z + S / 2) / S) * cv.height];
    ctx.fillStyle = '#14161a';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = '#3a3f46';
    ctx.strokeRect(2, 2, cv.width - 4, cv.height - 4);
    // road
    ctx.strokeStyle = '#4a4436';
    ctx.beginPath();
    const [rx1, rz1] = toCv(0, S / 2), [rx2, rz2] = toCv(0, -S / 2);
    ctx.moveTo(rx1, rz1); ctx.lineTo(rx2, rz2); ctx.stroke();
    for (const it of g.world.interactables) {
      const [cx, cz] = toCv(it.x, it.z);
      const colors = { shrine: '#ffd257', resource: '#7ae0a0', goal: '#7ae0ff', chest: '#c8a050', merchant: '#e0a0c0', pickup: '#b0e0ff', gate: '#ffb057' };
      ctx.fillStyle = colors[it.type] || '#888';
      if (it.used && it.type !== 'shrine') continue;
      ctx.beginPath(); ctx.arc(cx, cz, it.type === 'goal' || it.type === 'shrine' ? 7 : 4, 0, 7); ctx.fill();
    }
    for (const n of g.npcs) {
      if (n.combat.dead) continue;
      const [cx, cz] = toCv(n.pos.x, n.pos.z);
      ctx.fillStyle = n.faction === 'samurai_ally' ? '#7ac8ff' : n.faction === 'villager' ? '#9ae08a' : factionColor(n.faction);
      ctx.beginPath(); ctx.arc(cx, cz, n.isBoss ? 8 : 5, 0, 7); ctx.fill();
      if (n.isBoss) { ctx.strokeStyle = '#fff'; ctx.stroke(); }
    }
    const [px, pz] = toCv(g.player.pos.x, g.player.pos.z);
    ctx.fillStyle = '#c8a0ff';
    ctx.beginPath(); ctx.arc(px, pz, 6, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.stroke();
  }

  renderShop(body) {
    const g = this.game;
    const inv = g.inventory;
    const stock = [
      { id: 'bandage', price: 12 }, { id: 'healing_draught', price: 35 }, { id: 'focus_tonic', price: 26 },
      { id: 'war_bell', price: 65 }, { id: 'herb', price: 8 }, { id: 'iron_ore', price: 15 }, { id: 'silk', price: 22 },
      { id: 'iron_katana', price: 140 }, { id: 'ronin_garb', price: 160 },
    ];
    body.innerHTML = `
      <div class="shop-layout">
        <h3>Thương nhân lưu động <span class="dim">(${CURRENCY.icon} ${inv.coins})</span></h3>
        <div class="bag-list">
        ${stock.map((s) => {
          const def = itemDef(s.id);
          return `<div class="item-row" style="border-color:${this.rarityColor(def.rarity)}">
            <span class="item-icon">${def.icon}</span>
            <span class="item-info"><b>${esc(def.name)}</b><span class="dim">${esc(def.desc || '')}</span></span>
            <span class="item-qty">${CURRENCY.icon} ${s.price}</span>
            <span class="item-actions"><button data-buy="${s.id}" data-price="${s.price}" ${inv.coins >= s.price ? '' : 'disabled'}>Mua</button></span>
          </div>`;
        }).join('')}
        </div>
      </div>`;
    body.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => {
      const price = parseInt(b.dataset.price, 10);
      if (inv.spendCoins(price)) { inv.addItem(b.dataset.buy, 1); g.audio.sfx('coin'); g.ui.notify('item', `Mua ${itemDef(b.dataset.buy).name}`); }
      this.render();
    }));
  }
}
