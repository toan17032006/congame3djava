// Boss definitions. Phases trigger by HP percentage; each phase alters the move pool.
import { Registry } from '../framework/core/registry.js';
export const BOSSES = {
  bandit_king: { id: 'bandit_king', name: 'Kurogane - Vua Sơn Tặc', title: 'Lãnh chúa hầm ngục rừng',
    hp: 600, attack: 20, defense: 8, speed: 4.4, poise: 100, xp: 420, coins: 250,
    weapon: { style: 'club', len: 1.5, color: 0x3a2c1c }, colors: { cloth: 0x6a2a1a, skin: 0xbf9470, hair: 0x1a1008 },
    scale: 1.35, intro: '"Gì? Một kẻ lang thang dám cản đường ta?"',
    phases: [
      { hpPct: 1.0, cooldownMul: 1.0, speedMul: 1.0, moves: ['e_overhead', 'e_sweep', 'e_slam'] },
      { hpPct: 0.6, cooldownMul: 0.8, speedMul: 1.1, moves: ['e_slam', 'e_spin', 'e_overhead'], summons: [{ enemy: 'bandit_grunt', count: 2 }] },
      { hpPct: 0.25, cooldownMul: 0.6, speedMul: 1.25, moves: ['e_spin', 'e_slam', 'e_sweep', 'e_overhead'] },
    ],
    loot: [{ id: 'demon_fang', chance: 1, qty: 2 }, { id: 'iron_ore', chance: 1, qty: 3 }] },

  ronin_master: { id: 'ronin_master', name: 'Kagemune - Kiếm Khách Bóng', title: 'Ronin vô danh của con đường hẹp',
    hp: 700, attack: 26, defense: 10, speed: 5.8, poise: 70, xp: 620, coins: 400,
    weapon: { style: 'katana', len: 1.2, color: 0xc8d0dc }, colors: { cloth: 0x222a38, skin: 0xc9a284, hair: 0x0e0a08 },
    scale: 1.05, intro: '"Ta chưa gặp người sống sót sau nhát kiếm thứ hai."',
    phases: [
      { hpPct: 1.0, cooldownMul: 1.0, speedMul: 1.0, moves: ['e_light', 'e_combo2', 'e_overhead'] },
      { hpPct: 0.55, cooldownMul: 0.7, speedMul: 1.15, moves: ['e_combo2', 'e_spin', 'e_thrust', 'e_sweep'] },
    ],
    loot: [{ id: 'silk', chance: 1, qty: 3 }, { id: 'healing_draught', chance: 1, qty: 1 }] },

  ashura_lord: { id: 'ashura_lord', name: 'Hi no Ou - Vua Tu La', title: 'Ngọn lửa bất tín ngưỡng',
    hp: 950, attack: 32, defense: 14, speed: 5.2, poise: 90, xp: 900, coins: 600,
    weapon: { style: 'katana', len: 1.25, color: 0xe85830 }, colors: { cloth: 0x8a1a10, skin: 0xb08060, hair: 0x5a0e08 },
    scale: 1.2, fire: true, intro: '"Xác người là củi. Xin làm mồi cho ngọn lửa Tu La."',
    phases: [
      { hpPct: 1.0, cooldownMul: 1.0, speedMul: 1.0, moves: ['e_combo2', 'e_spin', 'fire_nova'] },
      { hpPct: 0.6, cooldownMul: 0.75, speedMul: 1.1, moves: ['fire_nova', 'e_spin', 'e_combo2', 'fire_ring'], summons: [{ enemy: 'ashura_adept', count: 1 }] },
      { hpPct: 0.25, cooldownMul: 0.55, speedMul: 1.2, moves: ['fire_nova', 'fire_ring', 'e_spin'] },
    ],
    loot: [{ id: 'demon_fang', chance: 1, qty: 3 }, { id: 'ashura_edge', chance: 0.35, qty: 1 }] },

  oni_general: { id: 'oni_general', name: 'Gashadokuro - Tướng Quỷ', title: 'Pho tượng sắt của thành bóng tối',
    hp: 1200, attack: 38, defense: 20, speed: 3.9, poise: 200, xp: 1300, coins: 850,
    weapon: { style: 'club', len: 1.8, color: 0x3a3050 }, colors: { cloth: 0x3a2a4e, skin: 0x9a8aa8, hair: 0x100c16 },
    scale: 1.55, intro: '"NGƯỜI... ĐÁNG... GHÉT."',
    phases: [
      { hpPct: 1.0, cooldownMul: 1.1, speedMul: 1.0, moves: ['e_slam', 'e_guardbreak', 'e_sweep'] },
      { hpPct: 0.6, cooldownMul: 0.85, speedMul: 1.1, moves: ['e_slam', 'e_guardbreak', 'e_spin', 'e_sweep'], summons: [{ enemy: 'oni_shield', count: 1 }] },
      { hpPct: 0.3, cooldownMul: 0.6, speedMul: 1.2, moves: ['e_spin', 'e_slam', 'e_guardbreak'] },
    ],
    loot: [{ id: 'demon_fang', chance: 1, qty: 4 }, { id: 'oni_cleaver', chance: 0.5, qty: 1 }] },

  shogun_shade: { id: 'shogun_shade', name: 'Yamikage - Mạc Phủ Bóng Tối', title: 'Cái chết đội mặt sống',
    hp: 1600, attack: 42, defense: 18, speed: 6.0, poise: 140, xp: 2200, coins: 1500,
    weapon: { style: 'katana', len: 1.3, color: 0x8a9ad8 }, colors: { cloth: 0x141a2c, skin: 0x7a8ab0, hair: 0x06080f },
    scale: 1.12, ghost: true, intro: '"Ngươi đã đến nơi rẻ nhất của số phận. Nơi đây ta cai quản cái chết."',
    phases: [
      { hpPct: 1.0, cooldownMul: 1.0, speedMul: 1.0, moves: ['e_combo2', 'e_thrust', 'shadow_fan'] },
      { hpPct: 0.66, cooldownMul: 0.75, speedMul: 1.15, moves: ['shadow_fan', 'e_spin', 'e_combo2', 'e_overhead'], summons: [{ enemy: 'shadow_blade', count: 2 }] },
      { hpPct: 0.33, cooldownMul: 0.5, speedMul: 1.3, moves: ['shadow_fan', 'e_spin', 'shadow_fan', 'e_overhead', 'e_thrust'] },
    ],
    loot: [{ id: 'shade_ash', chance: 1, qty: 4 }, { id: 'moon_sever', chance: 0.5, qty: 1 }] },
};

// Boss-only scripted attacks (projectiles / AoE handled by combat.js special-case)
export const bosses = new Registry({ name: 'bosses' });
bosses.registerAll(Object.values(BOSSES));

export const BOSS_ATTACKS = {
  fire_nova: { name: 'Tu La Nộ', dmgMul: 1.6, dur: 2.0, hitAt: 0.6, range: 4.5, arc: 6.3, anim: 'e_slam', stamina: 0, knockback: 8, moveImpulse: 0, aoe: true, fire: true },
  fire_ring: { name: 'Vòng Lửa', dmgMul: 1.2, dur: 1.8, hitAt: 0.55, range: 0, arc: 0, anim: 'e_cast', stamina: 0, knockback: 5, moveImpulse: 0, projectileFan: { count: 8, speed: 14, fire: true, spread: 6.3 }, telegraph: 0.7 },
  shadow_fan: { name: 'Ảnh Tán', dmgMul: 1.0, dur: 1.6, hitAt: 0.5, range: 0, arc: 0, anim: 'e_cast', stamina: 0, knockback: 3, moveImpulse: 0, projectileFan: { count: 5, speed: 20, spread: 1.1 }, telegraph: 0.5 },
};

// Player skill attacks (U key), gated by learned skills.
export const PLAYER_SKILLS = {
  iai: { name: 'Nhất Đao Trảm', dmgMul: 2.6, dur: 0.9, hitAt: 0.4, range: 3.4, arc: 1.2, anim: 'skill_iai', stamina: 35, knockback: 6, moveImpulse: 12, critBonus: 15 },
  whirlwind: { name: 'Cuồng Phong Trảm', dmgMul: 1.4, dur: 1.5, hitAt: [0.3, 0.55, 0.8], range: 3.0, arc: 6.3, anim: 'skill_whirl', stamina: 45, knockback: 4, moveImpulse: 0, aoe: true },
  windstep: { name: 'Tốc Ảnh', dmgMul: 1.1, dur: 0.5, hitAt: 0.35, range: 2.6, arc: 2.0, anim: 'skill_dash', stamina: 30, knockback: 0, moveImpulse: 18, buff: { nextHitPct: 0.8, duration: 3 } },
  ironwill: { name: 'Thân Bất Hoại', dmgMul: 0, dur: 0.6, hitAt: 0.5, range: 0, arc: 0, anim: 'skill_guard', stamina: 25, knockback: 0, moveImpulse: 0, selfBuff: { defensePct: 0.4, noStagger: true, duration: 10 } },
};
