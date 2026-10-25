// Skill tree: 3 branches. Active skills are assigned to the U key.
import { Registry } from '../framework/core/registry.js';
export const SKILL_TREE = {
  blade: { name: 'Nhánh Đao', color: '#e06a5a', nodes: [
    { id: 'blade_1', name: 'Thế Kiếm Vững', tier: 1, cost: 1, requires: [], passive: { attackFlat: 4 }, desc: '+4 công kích.' },
    { id: 'blade_2', name: 'Nhất Đao Trảm', tier: 2, cost: 1, requires: ['blade_1'], active: { skill: 'iai', name: 'Nhất Đao Trảm', stamina: 35, cooldown: 8, desc: 'Lao tới và rút kiếm chéo, sát thương lớn.' } },
    { id: 'blade_3', name: 'Điểm Huyết', tier: 2, cost: 2, requires: ['blade_1'], passive: { crit: 6 }, desc: '+6% chí mạng.' },
    { id: 'blade_4', name: 'Cuồng Phong Trảm', tier: 3, cost: 2, requires: ['blade_2', 'blade_3'], active: { skill: 'whirlwind', name: 'Cuồng Phong Trảm', stamina: 45, cooldown: 12, desc: 'Xoay tròn chém diện rộng quanh mình.' } },
    { id: 'blade_5', name: 'Sát Khí', tier: 4, cost: 3, requires: ['blade_4'], passive: { attackPct: 0.12 }, desc: '+12% công kích.' },
  ]},
  wind: { name: 'Nhánh Gió', color: '#6ab0e0', nodes: [
    { id: 'wind_1', name: 'Bước Nhẹ', tier: 1, cost: 1, requires: [], passive: { staminaCostMul: -0.1 }, desc: '-10% tiêu hao khí lực né và sprint.' },
    { id: 'wind_2', name: 'Né Ảnh', tier: 2, cost: 1, requires: ['wind_1'], passive: { dodgeIframes: 0.12 }, desc: '+0.12s bất khả xâm phạm khi né.' },
    { id: 'wind_3', name: 'Hành Vân', tier: 2, cost: 2, requires: ['wind_1'], passive: { moveSpeed: 0.1 }, desc: '+10% tốc chạy.' },
    { id: 'wind_4', name: 'Tốc Ảnh', tier: 3, cost: 2, requires: ['wind_2', 'wind_3'], active: { skill: 'windstep', name: 'Tốc Ảnh', stamina: 30, cooldown: 9, desc: 'Lao nhanh qua bóng kẻ địch, đòn kế +80% sát thương.' } },
    { id: 'wind_5', name: 'Hơi Thở Gió', tier: 4, cost: 3, requires: ['wind_4'], passive: { staminaRegen: 0.5 }, desc: '+0.5 hồi khí lực mỗi giây.' },
  ]},
  spirit: { name: 'Nhánh Tâm', color: '#b06ae0', nodes: [
    { id: 'spirit_1', name: 'Bản Lĩnh', tier: 1, cost: 1, requires: [], passive: { maxHp: 25 }, desc: '+25 máu tối đa.' },
    { id: 'spirit_2', name: 'Tâm Không', tier: 2, cost: 1, requires: ['spirit_1'], passive: { parryWindow: 0.08 }, desc: '+0.08s cửa sổ parry.' },
    { id: 'spirit_3', name: 'Lưng Sắt', tier: 2, cost: 2, requires: ['spirit_1'], passive: { defense: 8 }, desc: '+8 phòng thủ.' },
    { id: 'spirit_4', name: 'Thân Bất Hoại', tier: 3, cost: 2, requires: ['spirit_2', 'spirit_3'], active: { skill: 'ironwill', name: 'Thân Bất Hoại', stamina: 25, cooldown: 20, desc: '10s phòng thủ +40%, không choáng.' } },
    { id: 'spirit_5', name: 'Kiếm Thánh', tier: 4, cost: 3, requires: ['spirit_4'], passive: { maxStamina: 30, xpGain: 0.1 }, desc: '+30 khí lực tối đa, +10% kinh nghiệm.' },
  ]},
};

export const ALL_SKILLS = {};
for (const branch of Object.values(SKILL_TREE)) for (const n of branch.nodes) ALL_SKILLS[n.id] = n;

export const skills = new Registry({ name: 'skills' });
skills.registerAll(Object.values(ALL_SKILLS));

// Passive modifier aggregation
export function aggregatePassives(learnedIds) {
  const m = { attackFlat: 0, attackPct: 0, crit: 0, defense: 0, maxHp: 0, maxStamina: 0,
    staminaRegen: 0, staminaCostMul: 0, dodgeIframes: 0, parryWindow: 0, moveSpeed: 0, xpGain: 0 };
  for (const id of learnedIds) {
    const n = ALL_SKILLS[id];
    if (!n || !n.passive) continue;
    for (const [k, v] of Object.entries(n.passive)) m[k] += v;
  }
  return m;
}

export const STARTER_ACTIVES = ['iai']; // iai is free from the start
