// Persistence: versioned save data in localStorage + FastAPI/SQLite server sync.
const SCHEMA_VERSION = 1;
const LS_PREFIX = 'samurai_save_';

export class SaveSystem {
  constructor(game) { this.game = game; this.lastServerOk = null; }

  buildSaveData(slotName) {
    const g = this.game;
    return {
      version: SCHEMA_VERSION,
      data: {
        meta: {
          slotName: slotName || 'Chưa đặt tên',
          savedAt: Date.now(),
          playtime: Math.round(g.progression.stats.playtime),
          levelId: g.levelManager.currentId || 'L01',
          regionName: g.world.def ? g.world.def.name : '',
        },
        player: {
          ...g.progression.serialize(),
          inventory: g.inventory.serialize(),
          hp: Math.max(1, Math.round(g.player.hp)),
          pos: { x: Math.round(g.player.pos.x * 10) / 10, z: Math.round(g.player.pos.z * 10) / 10 },
        },
        progress: {
          levels: g.levelManager.serialize(),
          quests: g.quests.serialize(),
        },
      },
    };
  }

  save(slot, { silent = false } = {}) {
    const payload = this.buildSaveData(slot);
    try {
      localStorage.setItem(LS_PREFIX + slot, JSON.stringify(payload));
    } catch (e) {
      if (!silent) this.game.ui.notify('bad', 'Lưu cục bộ thất bại (bộ nhớ đầy?)');
    }
    // server sync (best-effort; local copy is the fallback)
    fetch(`/api/saves/${encodeURIComponent(slot)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => { this.lastServerOk = r.ok; })
      .catch(() => { this.lastServerOk = false; });
    if (!silent) this.game.ui.notify('save', 'Đã lưu tiến trình');
    return true;
  }

  readLocal(slot) {
    try {
      const raw = localStorage.getItem(LS_PREFIX + slot);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  async load(slot) {
    let payload = null;
    try {
      const res = await fetch(`/api/saves/${encodeURIComponent(slot)}`);
      if (res.ok) payload = await res.json();
    } catch { /* offline: fall back to localStorage */ }
    if (!payload || !payload.data) payload = this.readLocal(slot);
    if (!payload) return null;
    // schema versioning / migration
    if (payload.version !== SCHEMA_VERSION) {
      const migrated = this.migrate(payload);
      if (!migrated) return null;
      payload = migrated;
    }
    return payload.data;
  }

  migrate(payload) {
    // v1 is the first schema; future versions add migration steps here.
    if (payload.version < SCHEMA_VERSION) return null;
    return payload;
  }

  async listSlots() {
    const out = new Map();
    // local first (instant), server overrides with fresher data
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k.startsWith(LS_PREFIX)) continue;
        try {
          const p = JSON.parse(localStorage.getItem(k));
          const slot = k.slice(LS_PREFIX.length);
          out.set(slot, { slot, meta: p.data?.meta || {}, updated_at: p.data?.meta?.savedAt ? p.data.meta.savedAt / 1000 : 0, source: 'local' });
        } catch { /* corrupt local save: skip */ }
      }
    } catch { /* localStorage unavailable */ }
    try {
      const res = await fetch('/api/saves');
      if (res.ok) {
        const { saves } = await res.json();
        for (const s of saves || []) {
          const prev = out.get(s.slot);
          if (!prev || (s.updated_at || 0) >= prev.updated_at) {
            out.set(s.slot, { slot: s.slot, meta: { level: s.level, playtime: s.playtime }, updated_at: s.updated_at, source: 'server' });
          }
        }
      }
    } catch { /* server offline */ }
    return [...out.values()].sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  }

  deleteLocal(slot) { try { localStorage.removeItem(LS_PREFIX + slot); } catch {} }

  async deleteSlot(slot) {
    this.deleteLocal(slot);
    try { await fetch(`/api/saves/${encodeURIComponent(slot)}`, { method: 'DELETE' }); } catch {}
  }
}
