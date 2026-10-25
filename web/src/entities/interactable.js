// Interactables: resource nodes, shrines, chests, pickups, gates, goal markers, merchants.
import * as THREE from 'three';
import { makeNode, makeChest, makeLantern, makeCampfire, makeStatue } from '../gfx/props.js';
import { G, M } from '../gfx/materials.js';
import { itemDef } from '../data/items.js';

let UID = 1;

export class Interactable {
  constructor(game, cfg) {
    this.id = UID++;
    this.game = game;
    this.type = cfg.type;          // resource|shrine|chest|pickup|gate|goal|merchant
    this.x = cfg.x; this.z = cfg.z;
    this.y = cfg.y !== undefined ? cfg.y : game.world.groundAt(cfg.x, cfg.z);
    this.radius = cfg.radius || 1.6;
    this.item = cfg.item || null;  // for resource/pickup
    this.qty = cfg.qty || 1;
    this.data = cfg.data || {};
    this.respawn = cfg.respawn || 0; // seconds; 0 = one-shot
    this.used = false;
    this.respawnT = 0;
    this.group = new THREE.Group();
    this.group.position.set(this.x, this.y, this.z);
    this.label = cfg.label || '';
    this.build(cfg);
    game.engine.scene.add(this.group);
  }

  build(cfg) {
    const g = this.group;
    switch (this.type) {
      case 'resource': {
        const nodeType = { bamboo: 'bamboo_node', iron_ore: 'ore_node', herb: 'herb_node', shade_ash: 'ember_node' }[this.item] || 'herb_node';
        g.add(makeNode(nodeType, Math.random));
        // small marker ring
        const ring = new THREE.Mesh(G('ring', 0.5, 0.62, 16), new THREE.MeshBasicMaterial({ color: 0x7ae0a0, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.05;
        g.add(ring);
        this.ring = ring;
        break;
      }
      case 'chest': {
        const c = makeChest();
        g.add(c);
        this.lid = c.userData.lid;
        break;
      }
      case 'pickup': {
        const def = itemDef(this.item);
        const color = { 0: 0xd8d8d8, 1: 0x6fc46f, 2: 0x5b9bf0, 3: 0xb07ef5, 4: 0xf5a94b }[def.rarity] || 0xffffff;
        const m = new THREE.Mesh(G('sph', 0.18, 8, 6), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.4 }));
        m.position.y = 0.5;
        g.add(m);
        this.gem = m;
        break;
      }
      case 'shrine': {
        const l = makeLantern(true);
        g.add(l);
        g.add(makeCampfire());
        const ring = new THREE.Mesh(G('ring', 2.1, 2.3, 24), new THREE.MeshBasicMaterial({ color: 0xffd257, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06;
        g.add(ring);
        this.label = 'Điểm hồi sinh (E)';
        break;
      }
      case 'goal': {
        const statue = makeStatue();
        g.add(statue);
        const beam = new THREE.Mesh(G('cyl', 0.5, 0.7, 12, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x7ae0ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
        beam.position.y = 6;
        g.add(beam);
        this.beam = beam;
        this.label = cfg.data.name || 'Mục tiêu';
        break;
      }
      case 'merchant': {
        const l = makeLantern(true);
        l.position.set(-1.4, 0, 0);
        g.add(l);
        const banner = new THREE.Mesh(G('box', 1.6, 0.5, 0.06), M(0x8a5a2a));
        banner.position.set(0, 2.6, 0);
        g.add(banner);
        const pole = new THREE.Mesh(G('cyl', 0.05, 0.06, 2.8, 5), M(0x3e2c1c));
        pole.position.set(0, 1.4, 0);
        g.add(pole);
        this.label = 'Thương nhân (E)';
        break;
      }
      case 'gate': {
        // visual handled by level (torii etc.); just a trigger ring
        const ring = new THREE.Mesh(G('ring', this.radius - 0.2, this.radius, 24), new THREE.MeshBasicMaterial({ color: 0xffd257, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06;
        g.add(ring);
        this.ring = ring;
        this.label = cfg.data.label || 'Cửa ải';
        break;
      }
    }
  }

  prompt() {
    switch (this.type) {
      case 'resource': return `Thu thập ${itemDef(this.item).name} (E)`;
      case 'chest': return this.used ? '' : 'Mở rương (E)';
      case 'shrine': return 'Nghỉ tại đài hồi sinh - hồi máu & lưu game (E)';
      case 'pickup': return this.used ? '' : `Nhặt ${itemDef(this.item).name}`;
      case 'merchant': return 'Mua hàng (E)';
      case 'gate': return this.data.prompt || `Đi tiếp: ${this.data.name || 'khu vực kế tiếp'} (E)`;
      default: return this.label;
    }
  }

  use(player) {
    const game = this.game;
    switch (this.type) {
      case 'resource': {
        if (this.used) return false;
        this.used = true;
        this.respawnT = this.respawn;
        game.inventory.addItem(this.item, this.qty);
        game.ui.notify('item', `+${this.qty} ${itemDef(this.item).name}`);
        game.audio.sfx('pickup');
        player.anim.play('pickup', { restart: true });
        game.quests.onEvent('collect', { item: this.item, qty: this.qty });
        game.particles.spawn({ x: this.x, y: this.y + 0.8, z: this.z }, { count: 12, color: [0x7ae0a0, 0xffffff], speed: 2.5, life: 0.5 });
        this.group.visible = false;
        return true;
      }
      case 'chest': {
        if (this.used) return false;
        this.used = true;
        if (this.lid) this.lid.rotation.x = -1.2;
        for (const it of this.data.loot || []) {
          game.inventory.addItem(it.id, it.qty);
          game.ui.notify('item', `+${it.qty} ${itemDef(it.id).name}`);
        }
        if (this.data.coins) { game.inventory.addCoins(this.data.coins); game.ui.notify('gold', `+${this.data.coins} vàng`); }
        game.audio.sfx('unlock');
        return true;
      }
      case 'pickup': {
        if (this.used) return false;
        this.used = true;
        game.inventory.addItem(this.item, this.qty);
        game.ui.notify('item', `+${this.qty} ${itemDef(this.item).name}`);
        game.audio.sfx('pickup');
        this.group.visible = false;
        return true;
      }
      case 'shrine': {
        player.heal(player.maxHp);
        player.restoreStamina(player.maxStamina);
        game.saveSystem.save(game.currentSlot, game);
        game.progression.respawnPoint = { x: this.x, z: this.z };
        game.ui.notify('save', 'Đã hồi phục & lưu tiến trình');
        game.audio.sfx('heal');
        player.anim.play('interact', { restart: true });
        return true;
      }
      case 'merchant': {
        game.ui.panels.openShop();
        return true;
      }
      case 'gate': {
        if (this.data.onEnter) { this.data.onEnter(); return true; }
        return false;
      }
    }
    return false;
  }

  update(dt) {
    if (this.type === 'resource' && this.used && this.respawn > 0) {
      this.respawnT -= dt;
      if (this.respawnT <= 0) { this.used = false; this.group.visible = true; }
    }
    if (this.gem) {
      this.gem.position.y = 0.5 + Math.sin(this.game.time * 2.4 + this.id) * 0.12;
      this.gem.rotation.y += dt * 1.4;
    }
    if (this.beam) this.beam.material.opacity = 0.12 + Math.sin(this.game.time * 2) * 0.05;
  }

  dispose(game) {
    game.engine.scene.remove(this.group);
  }
}
