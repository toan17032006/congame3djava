// SettingsStore: cài đặt có mặc định + merge + persist + callback thay đổi.
// Storage inject được (localStorage trong browser, memoryStorage trong test/node).
export function memoryStorage(id = 'default') {
  const store = new Map();
  return {
    _id: id,
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
}

export class SettingsStore {
  constructor({ defaults = {}, storageKey = 'app_settings_v1', storage = null, merge = null, onChanged = null } = {}) {
    this.defaults = { ...defaults };
    this.storageKey = storageKey;
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : memoryStorage(storageKey));
    this._merge = merge || ((base, patch) => ({ ...base, ...patch }));
    this.onChanged = onChanged;
    this.state = this._merge(this.defaults, this._load());
  }

  _load() {
    try {
      const raw = this.storage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; } // dữ liệu hỏng: dùng mặc định
  }

  _persist() {
    try { this.storage.setItem(this.storageKey, JSON.stringify(this.state)); } catch { /* bộ nhớ đầy */ }
  }

  get(key) { return this.state[key]; }
  get all() { return this.state; }

  set(patch, { silent = false } = {}) {
    const prev = { ...this.state };
    this.state = this._merge(this._merge(this.defaults, this.state), patch);
    if (!silent) {
      this._persist();
      if (this.onChanged) this.onChanged(this.state, prev);
    }
    return this.state;
  }

  reset({ silent = false } = {}) {
    const prev = { ...this.state };
    this.state = { ...this.defaults };
    if (!silent) {
      this._persist();
      if (this.onChanged) this.onChanged(this.state, prev);
    }
    return this.state;
  }

  persist() { this._persist(); }
}
