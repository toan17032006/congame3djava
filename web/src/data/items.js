// Item database. `model` fields drive the procedural mesh factory (gfx/humanoid.js).
import { Registry } from '../framework/core/registry.js';
export const RARITY = [
  { id: 0, name: 'Thường', color: '#9aa5ad' },
  { id: 1, name: 'Hiếm', color: '#6fc46f' },
  { id: 2, name: 'Quý', color: '#5b9bf0' },
  { id: 3, name: 'Sử thi', color: '#b07ef5' },
  { id: 4, name: 'Huyền thoại', color: '#f5a94b' },
];

export const WEAPONS = {
  worn_katana: { name: 'Kiếm rỉ', type: 'weapon', rarity: 0, icon: '🗡', value: 10,
    stats: { damage: 12, speed: 1.0, stamina: 10, combo: 3, range: 2.3, crit: 5 },
    model: { style: 'katana', len: 1.05, color: 0x8a8f96 }, desc: 'Thanh kiếm cũ của người lính trơn.' },
  iron_katana: { name: 'Đao sắt', type: 'weapon', rarity: 1, icon: '🗡', value: 120,
    stats: { damage: 18, speed: 1.0, stamina: 11, combo: 3, range: 2.4, crit: 6 },
    model: { style: 'katana', len: 1.15, color: 0xc8ccd4 }, desc: 'Uchigatana rèn từ thép núi.' },
  wolf_fang: { name: 'Nha Lang Đao', type: 'weapon', rarity: 2, icon: '🗡', value: 320,
    stats: { damage: 24, speed: 1.05, stamina: 12, combo: 3, range: 2.5, crit: 9 },
    model: { style: 'katana', len: 1.2, color: 0x9fd8e8, guard: 'square' }, desc: 'Lưỡi cong như nanh sói, hại máu cao.' },
  nodachi: { name: 'Đại Thái Đao', type: 'weapon', rarity: 2, icon: '⚔', value: 380,
    stats: { damage: 32, speed: 0.82, stamina: 16, combo: 2, range: 2.9, crit: 4 },
    model: { style: 'nodachi', len: 1.5, color: 0xd8d2c0 }, desc: 'Cự đao dài, mỗi nhát là một nét vẽ chậm mà sâu.' },
  twin_petals: { name: 'Song Hoa Đao', type: 'weapon', rarity: 3, icon: '🗡', value: 520,
    stats: { damage: 27, speed: 1.18, stamina: 12, combo: 4, range: 2.4, crit: 12 },
    model: { style: 'katana', len: 1.1, color: 0xf0a5c0, guard: 'petal' }, desc: 'Nhẹ như cánh hoa, combo nhanh và dài.' },
  ashura_edge: { name: 'Tu La Đao', type: 'weapon', rarity: 3, icon: '🗡', value: 640,
    stats: { damage: 36, speed: 0.95, stamina: 14, combo: 3, range: 2.6, crit: 10 },
    model: { style: 'katana', len: 1.25, color: 0xe85a3a, guard: 'square' }, desc: 'Rút từ ngọn đền bị nguyền, thấm lửa Tu La.' },
  oni_cleaver: { name: 'Quỷ Trảm', type: 'weapon', rarity: 4, icon: '⚔', value: 900,
    stats: { damage: 44, speed: 0.85, stamina: 18, combo: 2, range: 3.0, crit: 8 },
    model: { style: 'nodachi', len: 1.55, color: 0x7a4de0, guard: 'oni' }, desc: 'Đại đao chém quỷ, rung lên gần cửa thành bóng tối.' },
  moon_sever: { name: 'Triệt Nguyệt', type: 'weapon', rarity: 4, icon: '🗡', value: 1200,
    stats: { damage: 40, speed: 1.1, stamina: 13, combo: 4, range: 2.7, crit: 15 },
    model: { style: 'katana', len: 1.3, color: 0xbfe8ff, guard: 'moon' }, desc: 'Thanh đao cuối cùng của dòng họ Nguyệt - nhẹ, nhanh, chí mạng khủng khiếp.' },
};

export const ARMORS = {
  straw_cloak: { name: 'Áo choàng rơm', type: 'armor', rarity: 0, icon: '🧥', value: 15,
    stats: { defense: 3, weight: 0 }, model: { tint: 0x9a8a5a, parts: [] }, desc: 'Tấm choàng của dân lữ hành.' },
  ronin_garb: { name: 'Trang phục ronin', type: 'armor', rarity: 1, icon: '🧥', value: 140,
    stats: { defense: 8, weight: 1 }, model: { tint: 0x3a4a5a, parts: ['sash'] }, desc: 'Bộ samurai của kẻ vô chủ.' },
  ashigaru_armor: { name: 'Giáp Ashigaru', type: 'armor', rarity: 1, icon: '🛡', value: 180,
    stats: { defense: 12, weight: 2 }, model: { tint: 0x5a5f6a, parts: ['sash', 'plates'] }, desc: 'Giáp tấm của lính bộ thường.' },
  do_maru: { name: 'Giáp Do-Maru', type: 'armor', rarity: 2, icon: '🛡', value: 400,
    stats: { defense: 18, weight: 3 }, model: { tint: 0x7a2a2a, parts: ['sash', 'plates', 'pauldrons'] }, desc: 'Giáp thân samurai khắc tiếng hạc.' },
  oni_hide: { name: 'Giáp da Quỷ', type: 'armor', rarity: 3, icon: '🛡', value: 700,
    stats: { defense: 26, weight: 4 }, model: { tint: 0x3a2a4a, parts: ['sash', 'plates', 'pauldrons', 'fur'] }, desc: 'Da quỷ nướng khói, gần như không thấm đòn thường.' },
};

export const HELMETS = {
  straw_hat: { name: 'Nón lá', type: 'helmet', rarity: 0, icon: '👒', value: 10,
    stats: { defense: 1 }, model: { style: 'straw' }, desc: 'Che nắng, đỡ được vài nhát roi.' },
  menpo_mask: { name: 'Mặt nạ Menpo', type: 'helmet', rarity: 2, icon: '🎭', value: 260,
    stats: { defense: 4 }, model: { style: 'mask' }, desc: 'Che mặt thép - kẻ địch run sợ trước cái lắc đầu.' },
  kabuto: { name: 'Mũ Kabuto', type: 'helmet', rarity: 3, icon: '⛩', value: 480,
    stats: { defense: 7 }, model: { style: 'kabuto' }, desc: 'Mũ chiến samurai với mạ hạc vàng.' },
};

export const ACCESSORIES = {
  jade_charm: { name: 'Bội ngọc bích', type: 'accessory', rarity: 1, icon: '🟢', value: 150,
    stats: { staminaRegen: 0.35 }, desc: 'Hồi phục khí lực nhanh hơn.' },
  fox_bead: { name: 'Hạt châu hồ ly', type: 'accessory', rarity: 2, icon: '🔴', value: 300,
    stats: { crit: 8 }, desc: 'Tăng mạnh tỉ lệ chí mạng.' },
  iron_talisman: { name: 'Bùa sắt thiêng', type: 'accessory', rarity: 2, icon: '🟡', value: 320,
    stats: { defense: 6 }, desc: 'Một lá bùa gia cố thân xác.' },
  war_drum: { name: 'Trống chiến nhỏ', type: 'accessory', rarity: 3, icon: '🥁', value: 500,
    stats: { attackPct: 0.1 }, desc: 'Tăng 10% công kích khi máu dưới 30%.' },
};

export const CONSUMABLES = {
  bandage: { name: 'Băng gạc', type: 'consumable', rarity: 0, icon: '🩹', value: 8,
    use: { heal: 35 }, desc: 'Hồi 35 máu, không tốn thời gian lâu.' },
  healing_draught: { name: 'Thuốc hồi phục', type: 'consumable', rarity: 1, icon: '🍶', value: 30,
    use: { heal: 80 }, desc: 'Rượu thuốc - hồi 80 máu.' },
  focus_tonic: { name: 'Tinh khí tán', type: 'consumable', rarity: 1, icon: '🍵', value: 26,
    use: { stamina: 60 }, desc: 'Phục hồi ngay 60 khí lực.' },
  war_bell: { name: 'Chuông chiến', type: 'consumable', rarity: 2, icon: '🔔', value: 60,
    use: { buff: { stat: 'attackPct', amount: 0.15, duration: 60 } }, desc: '60s công kích +15%.' },
};

export const MATERIALS = {
  bamboo: { name: 'Tre già', type: 'material', rarity: 0, icon: '🎍', value: 4, desc: 'Thân tre thẳng, dùng rèn và dựng.' },
  iron_ore: { name: 'Quặng sắt', type: 'material', rarity: 0, icon: '⛏', value: 8, desc: 'Đá đỏ thấm sắt.' },
  herb: { name: 'Cỏ linh chi', type: 'material', rarity: 0, icon: '🌿', value: 5, desc: 'Thảo dược chữa thương.' },
  leather: { name: 'Da thú', type: 'material', rarity: 0, icon: '🟫', value: 6, desc: 'Da thuộc từ sói rừng.' },
  silk: { name: 'Lụa', type: 'material', rarity: 1, icon: '🧵', value: 14, desc: 'Lụa mềm, lớp đệm giáp.' },
  demon_fang: { name: 'Nanh quỷ', type: 'material', rarity: 2, icon: '🦷', value: 40, desc: 'Rơi từ quỷ và Tu La.' },
  shade_ash: { name: 'Tro Bóng Tối', type: 'material', rarity: 2, icon: '🌑', value: 45, desc: 'Cặn của bóng tối - cần rèn vũ khí cuối.' },
};

export const ALL_ITEMS = { ...WEAPONS, ...ARMORS, ...HELMETS, ...ACCESSORIES, ...CONSUMABLES, ...MATERIALS };
export const CURRENCY = { name: 'Vàng mon', icon: '🪙' };

export const items = new Registry({ name: 'items' });
for (const [id, def] of Object.entries(ALL_ITEMS)) { def.id = def.id ?? id; items.register(def); }

export function itemDef(id) { return items.get(id); }
export function stackable(id) { const t = items.get(id)?.type; return t === 'material' || t === 'consumable'; }
