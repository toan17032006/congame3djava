// Enemy archetypes. `moves` reference attack defs used by systems/combat.js.
import { Registry } from '../framework/core/registry.js';
// AI parameters shape behavior (systems/ai logic in entities/npc.js).
export const ENEMIES = {
  bandit_grunt: { id: 'bandit_grunt', name: 'Sơn tặc', tier: 1,
    hp: 45, attack: 9, defense: 2, speed: 4.4, poise: 10, xp: 22, coins: 12,
    weapon: { style: 'club', len: 0.8, color: 0x6a5236 }, colors: { cloth: 0x5a4632, skin: 0xc9a284, hair: 0x2a2118 },
    scale: 1.0,
    ai: { sight: 26, attackRange: 2.2, cooldown: 1.6, blockChance: 0.1, dodgeChance: 0.05, strafeChance: 0.3, assistRadius: 18,
      moves: ['e_light', 'e_light', 'e_overhead'] },
    loot: [{ id: 'herb', chance: 0.3, qty: 1 }, { id: 'bamboo', chance: 0.2, qty: 1 }, { id: 'bandage', chance: 0.15, qty: 1 }] },

  bandit_archer: { id: 'bandit_archer', name: 'Cung thủ', tier: 1,
    hp: 35, attack: 11, defense: 1, speed: 4.6, poise: 8, xp: 26, coins: 15,
    weapon: { style: 'bow', len: 0.9, color: 0x6a5236 }, colors: { cloth: 0x4a5a3a, skin: 0xc9a284, hair: 0x3a2a18 },
    scale: 1.0, ranged: { projSpeed: 22, cooldown: 2.6, range: 24, dmgMul: 1.0 },
    ai: { sight: 30, attackRange: 16, cooldown: 2.8, blockChance: 0.05, dodgeChance: 0.25, strafeChance: 0.6, assistRadius: 20,
      moves: ['e_light'] },
    loot: [{ id: 'herb', chance: 0.25, qty: 1 }, { id: 'leather', chance: 0.2, qty: 1 }] },

  bandit_brute: { id: 'bandit_brute', name: 'Bạo đồ', tier: 2,
    hp: 110, attack: 17, defense: 5, speed: 3.6, poise: 40, xp: 55, coins: 30,
    weapon: { style: 'club', len: 1.3, color: 0x4a3a28 }, colors: { cloth: 0x6a3a2a, skin: 0xbf9470, hair: 0x1a1410 },
    scale: 1.18,
    ai: { sight: 24, attackRange: 2.7, cooldown: 2.2, blockChance: 0, dodgeChance: 0, strafeChance: 0.15, assistRadius: 14,
      moves: ['e_slam', 'e_sweep', 'e_overhead'] },
    loot: [{ id: 'leather', chance: 0.4, qty: 2 }, { id: 'iron_ore', chance: 0.3, qty: 1 }] },

  ashigaru_spear: { id: 'ashigaru_spear', name: 'Lính mác', tier: 2,
    hp: 70, attack: 14, defense: 8, speed: 4.2, poise: 20, xp: 42, coins: 22,
    weapon: { style: 'spear', len: 1.9, color: 0x8a6a4a }, colors: { cloth: 0x3a4a5a, skin: 0xc9a284, hair: 0x241a12 },
    scale: 1.0,
    ai: { sight: 28, attackRange: 3.2, cooldown: 1.9, blockChance: 0.3, dodgeChance: 0.1, strafeChance: 0.2, assistRadius: 16,
      moves: ['e_thrust', 'e_thrust', 'e_sweep'] },
    loot: [{ id: 'iron_ore', chance: 0.35, qty: 1 }, { id: 'bandage', chance: 0.25, qty: 1 }] },

  ronin_duelist: { id: 'ronin_duelist', name: 'Ronin du thủ', tier: 3,
    hp: 95, attack: 18, defense: 8, speed: 5.2, poise: 24, xp: 70, coins: 45,
    weapon: { style: 'katana', len: 1.1, color: 0xb8bec8 }, colors: { cloth: 0x2a3440, skin: 0xc9a284, hair: 0x14100c },
    scale: 1.02,
    ai: { sight: 30, attackRange: 2.4, cooldown: 1.4, blockChance: 0.45, dodgeChance: 0.35, strafeChance: 0.5, retreatAt: 0.3, assistRadius: 0,
      moves: ['e_light', 'e_combo2', 'e_overhead', 'e_sweep'] },
    loot: [{ id: 'silk', chance: 0.4, qty: 1 }, { id: 'bandage', chance: 0.3, qty: 1 }, { id: 'healing_draught', chance: 0.15, qty: 1 }] },

  elite_samurai: { id: 'elite_samurai', name: 'Vệ sĩ samurai', tier: 4,
    hp: 150, attack: 24, defense: 14, speed: 4.8, poise: 45, xp: 110, coins: 70,
    weapon: { style: 'katana', len: 1.2, color: 0xd8dde6 }, colors: { cloth: 0x6a2a2a, skin: 0xc9a284, hair: 0x100c08 },
    scale: 1.06,
    ai: { sight: 30, attackRange: 2.5, cooldown: 1.3, blockChance: 0.5, dodgeChance: 0.3, strafeChance: 0.45, assistRadius: 20,
      moves: ['e_combo2', 'e_overhead', 'e_thrust', 'e_guardbreak'] },
    loot: [{ id: 'silk', chance: 0.5, qty: 2 }, { id: 'demon_fang', chance: 0.1, qty: 1 }] },

  ashura_adept: { id: 'ashura_adept', name: 'Tín đồ Tu La', tier: 4,
    hp: 120, attack: 26, defense: 10, speed: 5.0, poise: 30, xp: 120, coins: 75,
    weapon: { style: 'katana', len: 1.15, color: 0xe8683a }, colors: { cloth: 0x8a2418, skin: 0xb08a70, hair: 0x6a1410 },
    scale: 1.05, ranged: { projSpeed: 18, cooldown: 4.5, range: 20, dmgMul: 0.9, fire: true },
    ai: { sight: 32, attackRange: 2.5, cooldown: 1.5, blockChance: 0.2, dodgeChance: 0.35, strafeChance: 0.55, assistRadius: 22,
      moves: ['e_combo2', 'e_spin'] },
    loot: [{ id: 'demon_fang', chance: 0.3, qty: 1 }, { id: 'herb', chance: 0.3, qty: 1 }] },

  wraith: { id: 'wraith', name: 'Vong linh', tier: 3,
    hp: 55, attack: 16, defense: 4, speed: 6.4, poise: 6, xp: 60, coins: 20,
    weapon: { style: 'claw', len: 0.5, color: 0x9ab8d8 }, colors: { cloth: 0x30404a, skin: 0x9ab0c8, hair: 0x1a2430 },
    scale: 1.0, ghost: true,
    ai: { sight: 34, attackRange: 2.0, cooldown: 1.1, blockChance: 0, dodgeChance: 0.5, strafeChance: 0.4, assistRadius: 24,
      moves: ['e_light', 'e_light', 'e_sweep'] },
    loot: [{ id: 'shade_ash', chance: 0.25, qty: 1 }] },

  shadow_blade: { id: 'shadow_blade', name: 'Bóng kiếm', tier: 5,
    hp: 110, attack: 30, defense: 10, speed: 6.0, poise: 18, xp: 150, coins: 90,
    weapon: { style: 'katana', len: 1.2, color: 0x7a8ab8 }, colors: { cloth: 0x1a2030, skin: 0x8a9ac0, hair: 0x0a0e18 },
    scale: 1.02, ghost: true,
    ai: { sight: 36, attackRange: 2.4, cooldown: 1.1, blockChance: 0.35, dodgeChance: 0.45, strafeChance: 0.5, assistRadius: 0,
      moves: ['e_combo2', 'e_overhead', 'e_spin'] },
    loot: [{ id: 'shade_ash', chance: 0.4, qty: 1 }, { id: 'demon_fang', chance: 0.2, qty: 1 }] },

  oni_shield: { id: 'oni_shield', name: 'Quỷ khiên thủ', tier: 5,
    hp: 220, attack: 28, defense: 22, speed: 3.8, poise: 80, xp: 180, coins: 110,
    weapon: { style: 'club', len: 1.2, color: 0x4a3858 }, colors: { cloth: 0x3a2a4a, skin: 0xa08a9a, hair: 0x14101a },
    scale: 1.22,
    ai: { sight: 26, attackRange: 2.7, cooldown: 2.0, blockChance: 0.7, dodgeChance: 0, strafeChance: 0.1, assistRadius: 18,
      moves: ['e_slam', 'e_guardbreak', 'e_sweep'] },
    loot: [{ id: 'demon_fang', chance: 0.45, qty: 1 }, { id: 'iron_ore', chance: 0.4, qty: 2 }] },
};

// Registry của framework: tra cứu theo id thay vì chỉ số mảng/objet rải rác.
export const enemies = new Registry({ name: 'enemies' });
enemies.registerAll(Object.values(ENEMIES));

// NPC attack definitions (interpreted by combat system; `anim` maps to a clip name).
export const NPC_ATTACKS = {
  e_light: { name: 'Chém', dmgMul: 1.0, dur: 0.9, hitAt: 0.45, range: 2.2, arc: 1.8, anim: 'e_light', stamina: 8, knockback: 2, moveImpulse: 3 },
  e_combo2: { name: 'Song chém', dmgMul: 1.15, dur: 1.25, hitAt: [0.4, 0.72], range: 2.3, arc: 1.9, anim: 'e_combo2', stamina: 12, knockback: 2, moveImpulse: 3.5 },
  e_overhead: { name: 'Trảm xuống', dmgMul: 1.5, dur: 1.4, hitAt: 0.62, range: 2.5, arc: 1.4, anim: 'e_overhead', stamina: 14, knockback: 5, moveImpulse: 4, animSpeed: 0.9 },
  e_thrust: { name: 'Đâm', dmgMul: 1.2, dur: 1.0, hitAt: 0.5, range: 3.1, arc: 0.6, anim: 'e_thrust', stamina: 10, knockback: 3, moveImpulse: 5 },
  e_slam: { name: 'Đập đất', dmgMul: 1.8, dur: 1.8, hitAt: 0.66, range: 3.0, arc: 2.6, anim: 'e_slam', stamina: 20, knockback: 7, moveImpulse: 2.5, guardBreak: true },
  e_sweep: { name: 'Quét chân', dmgMul: 1.1, dur: 1.2, hitAt: 0.55, range: 2.4, arc: 2.8, anim: 'e_sweep', stamina: 12, knockback: 4, moveImpulse: 2 },
  e_spin: { name: 'Xoay trảm', dmgMul: 1.3, dur: 1.5, hitAt: [0.5, 0.75], range: 2.6, arc: 6.3, anim: 'e_spin', stamina: 16, knockback: 4, moveImpulse: 1.5 },
  e_guardbreak: { name: 'Phá thủ', dmgMul: 1.4, dur: 1.6, hitAt: 0.6, range: 2.6, arc: 1.6, anim: 'e_overhead', stamina: 18, knockback: 6, moveImpulse: 3.5, guardBreak: true, unblockable: false },
};
