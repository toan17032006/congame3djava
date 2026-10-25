// Faction hostility matrix.
export const FACTIONS = {
  player: { name: 'Người chơi', color: '#7ae0ff' },
  samurai_ally: { name: 'Quân samurai', color: '#7ac8ff' },
  villager: { name: 'Dân làng', color: '#9ae08a' },
  bandit: { name: 'Sơn tặc', color: '#e08a5a' },
  ashigaru: { name: 'Quân nô tặc', color: '#e0b05a' },
  ronin: { name: 'Ronin', color: '#c8b0e0' },
  ashura: { name: 'Tu La', color: '#ff6a4a' },
  shade: { name: 'Bóng tối', color: '#9a9aff' },
  oni: { name: 'Quỷ', color: '#c86aff' },
  castle: { name: 'Vệ thành', color: '#ff5a7a' },
};

const HOSTILE = {
  player: ['bandit', 'ashigaru', 'ashura', 'shade', 'oni', 'castle'],
  samurai_ally: ['bandit', 'ashigaru', 'ashura', 'shade', 'oni', 'castle'],
  bandit: ['player', 'samurai_ally', 'villager'],
  ashigaru: ['player', 'samurai_ally', 'villager'],
  ronin: [],              // neutral until provoked (handled by aggro flag)
  ashura: ['player', 'samurai_ally'],
  shade: ['player', 'samurai_ally'],
  oni: ['player', 'samurai_ally'],
  castle: ['player', 'samurai_ally'],
  villager: [],
};

export function isHostile(a, b) {
  if (!a || !b || a === b) return false;
  return (HOSTILE[a] || []).includes(b);
}
export function factionName(f) { return FACTIONS[f]?.name || f; }
export function factionColor(f) { return FACTIONS[f]?.color || '#ffffff'; }
